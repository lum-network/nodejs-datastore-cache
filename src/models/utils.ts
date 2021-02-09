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
export const propToDatastore = (elem: unknown, store: datastore.Datastore): any => {
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
