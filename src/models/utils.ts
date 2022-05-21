import * as datastore from '@google-cloud/datastore';

import { Entity, Key, GeoPt } from '.';

/**
 * Clean method to access plain object property
 *
 * @param o the object
 * @param propertyName the prop name
 */
export const getKeyValue = <T, K extends keyof T>(o: T, propertyName: K): T[K] => {
    return o[propertyName];
};

/**
 * Recursively converts object properties into datastore elements that can later be used by
 * datastore client calls such as save.
 *
 * @param elem either a native type or one of this module types (Entity, Key, GeoPt)
 * @param store a datastore client instance
 */
export const propToDatastore = (elem: unknown): any => {
    if (elem instanceof Array) {
        return elem.map((v) => propToDatastore(v));
    } else if (elem instanceof Entity) {
        return (elem as Entity).toDatastoreObject(true);
    } else if (elem instanceof Key) {
        return (elem as Key).toDatastore();
    } else if (elem instanceof GeoPt) {
        return (elem as GeoPt).toDatastore();
    }
    return elem;
};

/**
 * Recursively converts object properties into plain objects that can be safely serialized into JSON or other
 * string based representation.
 *
 * @param elem either a native type or one of this module types (Entity, Key, GeoPt)
 * @param store a datastore client instance
 * @param keyLocationPrefix optional key location prefix used by Key.encode method
 */
export const propToPlain = async (elem: unknown, store: datastore.Datastore, keyLocationPrefix?: string): Promise<any> => {
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

/**
 * Create a nested entity from a legacy flatten entity
 *
 * Legacy flattened entities structures where stored using dots instead of actual structures.
 * Example:
 * - flattened (legacy): { inner.text_value: '1', inner.number_value: 2 }
 * - nested: { inner: { text_value: '1', number_value: 2 } }
 * @param dsEntity a datastore entity, either from a previous Entity.toDatastore call or retrieve from a datastore call
 * @returns the entity with all flatten fields nested
 */
export const legacyEntityToNested = (dsEntity: any): any => {
    const nestedEntity: any = {};
    let found = false;
    const props = Object.getOwnPropertyNames(dsEntity) as Array<string>;
    for (const p of props) {
        if (p.indexOf('.') >= 0) {
            found = true;
            const parts = p.split('.');
            if (dsEntity[p] instanceof Array) {
                if (!nestedEntity[parts[0]]) {
                    nestedEntity[parts[0]] = [];
                }
                for (let i = 0; i < dsEntity[p].length; i++) {
                    if (nestedEntity[parts[0]].length <= i) {
                        nestedEntity[parts[0]].push({});
                    }
                    nestedEntity[parts[0]][i][parts[1]] = dsEntity[p][i];
                }
            } else {
                if (!nestedEntity[parts[0]]) {
                    nestedEntity[parts[0]] = {};
                }
                nestedEntity[parts[0]][parts[1]] = dsEntity[p];
            }
        } else {
            nestedEntity[p] = dsEntity[p];
        }
    }
    if (!found) {
        return dsEntity;
    }
    return nestedEntity;
};

/**
 * Sorts an object properties recursively.
 *
 * @param jsonObj object to sort
 * @returns a new object with keys sorted alphabetically
 */
export const sortJSON = <T>(jsonObj: T): T => {
    if (jsonObj instanceof Array) {
        for (let i = 0; i < jsonObj.length; i++) {
            jsonObj[i] = sortJSON(jsonObj[i]);
        }
        return jsonObj;
    } else if (typeof jsonObj !== 'object') {
        return jsonObj;
    }

    let keys = Object.keys(jsonObj) as Array<keyof T>;
    keys = keys.sort();
    const newObject: Partial<T> = {};
    for (let i = 0; i < keys.length; i++) {
        newObject[keys[i]] = sortJSON(jsonObj[keys[i]]);
    }
    return newObject as T;
};
