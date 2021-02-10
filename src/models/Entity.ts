import * as datastore from '@google-cloud/datastore';
import { entity as datastore_entity } from '@google-cloud/datastore/build/src/entity';
import { ClassConstructor, classToPlain, ClassTransformOptions, plainToClass } from 'class-transformer';

import { Key, PersistKey } from '.';
import { getKeyValue, propToPlain, propToDatastore } from './utils';

const cto: ClassTransformOptions = { strategy: 'excludeAll' };

/**
 * DatastoreEntity as used by the datastore client for calls such as save
 */
export type DatastoreEntity = {
    key: datastore_entity.Key;
    data: { [Key: string]: unknown };
};

/**
 * Entity abstract wrapper for datastore entities.
 *
 * This abstract class is intented to be inherited by each model aiming to be saved at some point into the datastore.
 *
 * Important notes:
 * - @Persist | @PersistKey | @PersistStruct must be specified on all properties that need to be persisted into datastore
 * - A property starting with an underscore `_` will be considered private and will not be persisted
 *
 */
export abstract class Entity {
    @PersistKey()
    key?: Key;

    /**
     * Create a new Entity with an optional key
     *
     * @param key the entity key
     */
    constructor(key?: Key) {
        this.key = key;
    }

    /**
     * Converts a datastore entity into an Entity inheriting model
     *
     * @param dsEntity a datastore entity, either from a previous Entity.toDatastore call or retrieve from a datastore call
     * @param cls the class to convert the datastore entity into
     * @param store a datastore client instance
     */
    static fromDatastore = <T extends Entity>(dsEntity: any, cls: ClassConstructor<T>): T => {
        if (dsEntity[datastore_entity.KEY_SYMBOL]) {
            // Deserializing from datastore response
            const entity: T = plainToClass(cls, dsEntity, cto);
            entity.key = Key.fromDatastore(dsEntity[datastore_entity.KEY_SYMBOL]);
            return entity;
        }
        // Deserializing invalid entity
        throw Error('cannot deserialize entity without key');
    };

    /**
     * Converts a plain object eventually created by the Entity.toPlain method into an Entity instance.
     *
     * @param plainEntity a plain object that was eventually created by the Entity.toPlain method
     * @param cls the class to convert the plain object into
     */
    static fromPlain = <T extends Entity>(plainEntity: object, cls: ClassConstructor<T>): T => {
        const e = plainToClass(cls, plainEntity, cto);
        // const props = Object.getOwnPropertyNames(e) as Array<keyof Entity>;

        // // @ts-ignore
        // const t = new Entity();
        // const reflectedType = (Reflect as any).getMetadata('design:type', Entity.prototype, 'key');
        // console.log('-.-.->', reflectedType);

        // for (const i in props) {
        //     const p = props[i];
        //     console.log('----->', p, Reflect.getMetadata('design:type', e, p));
        // }
        return e;
    };

    /**
     * Converts entity properties into datastore properties
     * This method should rarely be used by outside code.
     *
     * @param nested whether or not the entity is the root entity or a nested one
     */
    toDatastoreObject = (nested: boolean): { [Key: string]: unknown } => {
        const obj: { [Key: string]: unknown } = {};
        const props = Object.getOwnPropertyNames(this) as Array<keyof Entity>;
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            if ((nested === false && p === 'key') || p.startsWith('_') || typeof v === 'function') {
                continue;
            }
            obj[p] = propToDatastore(v);
        }
        return obj;
    };

    /**
     * Converts entity properties into datastore properties
     * This method should rarely be used by outside code.
     */
    toDatastore = (): DatastoreEntity => {
        if (!this.key) {
            throw new Error('entity withou key cannot be saved into datastore');
        }
        return {
            key: this.key && this.key.toDatastore(),
            data: this.toDatastoreObject(false),
        };
    };

    /**
     * Converts the entity into a plain javascript object that can safely be serialized into JSON or other string based
     * representations.
     *
     * @param store a datastore client instance
     * @param keyLocationPrefix optional key location prefix used by Key.encode method
     */
    toPlain = async (store: datastore.Datastore, keyLocationPrefix?: string): Promise<{ [Key: string]: unknown }> => {
        const obj: { [Key: string]: unknown } = {};
        const props = Object.getOwnPropertyNames(this) as Array<keyof Entity>;
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            if (p.startsWith('_') || typeof v === 'function') {
                continue;
            }
            obj[p] = await propToPlain(v, store, keyLocationPrefix);
        }
        return obj;
    };
}
