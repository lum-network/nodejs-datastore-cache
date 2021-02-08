import * as datastore from '@google-cloud/datastore';
import { ClassConstructor, classToPlain, ClassTransformOptions, Expose, Type, plainToClass } from 'class-transformer';

import { GeoPt, Key } from '.';

const cto: ClassTransformOptions = { strategy: 'excludeAll' };

export type DatastoreEntity = {
    key: datastore.Key;
    data: { [Key: string]: unknown };
};

const getKeyValue = <T, K extends keyof T>(o: T, propertyName: K): T[K] => {
    return o[propertyName];
};

const propToDatastore = (elem: unknown, store: datastore.Datastore): any => {
    if (elem instanceof Array) {
        return elem.map((v) => propToDatastore(v, store));
    } else if (elem instanceof Entity) {
        return (elem as Entity).toDatastoreObject(store, true);
    } else if (elem instanceof Key) {
        return (elem as Key).toDatastore();
    } else if (elem instanceof GeoPt) {
        return (elem as GeoPt).toDatastore(store);
    }
    return elem;
};

const propToPlain = async (elem: unknown, store: datastore.Datastore, keyLocationPrefix?: string): Promise<any> => {
    if (elem instanceof Array) {
        return await Promise.all(elem.map((v) => propToPlain(v, store, keyLocationPrefix)));
    } else if (elem instanceof Entity) {
        return await (elem as Entity).toPlain(store, keyLocationPrefix);
    } else if (elem instanceof Key) {
        return await (elem as Key).encode(store, keyLocationPrefix);
    } else if (elem instanceof GeoPt) {
        return (elem as GeoPt).toPlain();
    }
    return elem;
};

export abstract class Entity {
    @Type(() => Key)
    @Expose()
    key?: Key;

    constructor(key?: Key) {
        this.key = key;
    }

    static fromDatastore = <T extends Entity>(dsEntity: any, cls: ClassConstructor<T>, store: datastore.Datastore): T => {
        if (dsEntity[store.KEY]) {
            // Deserializing from datastore response
            const plainData = classToPlain(dsEntity);
            const entity: T = plainToClass(cls, plainData, cto);
            entity.key = Key.fromDatastore(dsEntity[store.KEY]);
            return entity;
        }
        // Deserializing from previous toDatastore call
        const plainData = classToPlain(dsEntity.data);
        const entity: T = plainToClass(cls, plainData, cto);
        if (dsEntity.key) {
            entity.key = Key.fromDatastore(dsEntity.key);
        }
        return entity;
    };

    toDatastoreObject = (store: datastore.Datastore, nested: boolean): { [Key: string]: unknown } => {
        const obj: { [Key: string]: unknown } = {};
        const props = Object.getOwnPropertyNames(this) as Array<keyof Entity>;
        for (const i in props) {
            const p = props[i];
            const v = getKeyValue(this, p);
            if ((nested === false && p === 'key') || p.startsWith('_') || typeof v === 'function') {
                continue;
            }
            obj[p] = propToDatastore(v, store);
        }
        return obj;
    };

    toDatastore = (store: datastore.Datastore): DatastoreEntity => {
        if (!this.key) {
            throw new Error('entity withou key cannot be saved into datastore');
        }
        return {
            key: this.key && this.key.toDatastore(),
            data: this.toDatastoreObject(store, false),
        };
    };

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
