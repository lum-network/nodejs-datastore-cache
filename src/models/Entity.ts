import * as datastore from '@google-cloud/datastore';
import { entity as datastore_entity } from '@google-cloud/datastore/build/src/entity';
import { ClassConstructor, Exclude, plainToInstance } from 'class-transformer';

import { Key, PersistKey } from '.';
import { DatastoreOptions } from './decorators';
import { getAttributes } from './metadata';
import { getKeyValue, propToPlain, propToDatastore, legacyEntityToNested } from './utils';

/**
 * DatastoreEntity as used by the datastore client for calls such as save
 */
export type DatastoreEntity = {
    key: datastore_entity.Key;
    data: { [Key: string]: unknown };
    excludeFromIndexes?: string[];
};

/**
 * Entity abstract wrapper for datastore entities.
 *
 * This abstract class is intented to be inherited by each model aiming to be saved at some point into the datastore.
 *
 * Important notes:
 * - @Persist | @PersistKey | @PersistStruct must be specified on all properties that need to be persisted into datastore and cache
 * - A property starting with an underscore `_` will be considered private and will not be persisted
 *
 */
@Exclude()
export abstract class Entity {
    _beforeSaveHook?: () => Promise<void>;

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
     */
    static fromDatastore = <T extends Entity>(dsEntity: any, cls: ClassConstructor<T>): T => {
        if (dsEntity[datastore_entity.KEY_SYMBOL]) {
            // Deserializing from datastore response
            const entity: T = plainToInstance(cls, legacyEntityToNested(dsEntity, cls));
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
        return plainToInstance(cls, plainEntity);
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
        const attributes = getAttributes(this);
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            if ((nested === false && p === 'key') || p.startsWith('_') || typeof v === 'function') {
                continue;
            }
            const attrs = (attributes[p] as DatastoreOptions) || {};
            obj[attrs.name || p] = propToDatastore(v);
        }
        return obj;
    };

    /**
     * Gets the indexes exclusions from the decorators metadata
     * Such as @Persist({ noindex: true })
     *
     * Notes:
     * - This basically output something like ['text', 'arr[]', 'inner.text', 'inner.arr[]'] depending on the props
     * - The output is not deterministic and will depend on the current instance. This is not an issue but good to know I guess.
     *
     * @returns
     */
    getIndexesExclusions = (): string[] => {
        const exclusions: string[] = [];

        // Compute direct properties
        const attrs: { [key: string]: any } = getAttributes(this) || {};
        for (const prop in attrs) {
            if (attrs[prop] && attrs[prop].noindex === true) {
                if (getKeyValue(this, prop as keyof this) instanceof Array) {
                    exclusions.push(`${prop}[]`);
                } else {
                    exclusions.push(prop);
                }
            }
        }

        // Compute nested properties
        const props = Object.getOwnPropertyNames(this) as Array<keyof Entity>;
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            let nestedExclusions: string[] = [];
            let prefix = `${p}`;
            if (v instanceof Entity) {
                nestedExclusions = (v as Entity).getIndexesExclusions();
            } else if (v instanceof Array && v.length > 0 && v[0] instanceof Entity) {
                nestedExclusions = (v[0] as Entity).getIndexesExclusions();
                prefix = `${p}[]`;
            }
            exclusions.push(...nestedExclusions.map((e) => `${prefix}.${e}`));
        }

        return exclusions;
    };

    /**
     * Converts entity properties into datastore properties
     * This method should rarely be used by outside code.
     */
    toDatastore = (): DatastoreEntity => {
        if (!this.key) {
            throw new Error('entity without key cannot be saved into datastore');
        }
        return {
            key: this.key && this.key.toDatastore(),
            data: this.toDatastoreObject(false),
            excludeFromIndexes: this.getIndexesExclusions(),
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
        const attributes = getAttributes(this);
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            if (p.startsWith('_') || typeof v === 'function') {
                continue;
            }
            const attrs = (attributes[p] as DatastoreOptions) || {};
            obj[attrs.name || p] = await propToPlain(v, store, keyLocationPrefix);
        }
        return obj;
    };
}
