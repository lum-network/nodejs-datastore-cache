import * as datastore from '@google-cloud/datastore';
import { ClassConstructor } from 'class-transformer';

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
 * Handles up to 2 level of nested properties which should be the legacy datastore limitation as well
 *
 * Legacy flattened entities structures where stored using dots instead of actual structures.
 * Example:
 * - flattened (legacy): { inner.text_value: '1', inner.number_value: 2 }
 * - nested: { inner: { text_value: '1', number_value: 2 } }
 * @param dsEntity a datastore entity, either from a previous Entity.toDatastore call or retrieve from a datastore call
 * @param cls a ClassContructor with property definitions
 * @returns the entity with all flatten fields nested
 */
export const legacyEntityToNested = <T>(dsEntity: any, cls: ClassConstructor<T>): any => {
    const nestedEntity: any = {};
    let foundNestedProperty = false;
    const props = Object.getOwnPropertyNames(dsEntity);
    for (const propName of props) {
        if (propName.indexOf('.') >= 0) {
            // Property name indicates that it holds flattened nested values
            // 1 nested level
            // case1: my_prop.sub_prop = value
            // case2: my_prop.sub_prop = [value]
            // 2 nested levels
            // case3: my_prop.sub_prop.inner_prop = value
            // case4: my_prop.sub_prop.inner_prop = [value]
            //
            // Arrays can lead to two nested types and we only can determine the proper one using Reflection on the destination Class (cls)
            // ex1: { my_prop: { sub_prop: [value] } }
            // ex2: { my_prop: { sub_prop: [{ inner_prop: value }] } }
            // ex3: { my_prop: [{ sub_prop: value }] }
            // ex4: { my_prop: [{ sub_prop: { inner_prop: value } }] }
            foundNestedProperty = true;
            const nameParts = propName.split('.');
            if (dsEntity[propName] instanceof Array) {
                if (!nestedEntity[nameParts[0]]) {
                    if ((Reflect as any).getMetadata('design:type', cls.prototype, nameParts[0]) === Array) {
                        // First nested level is an array
                        // ex3: { my_prop: [{ sub_prop: value }] }
                        // ex4: { my_prop: [{ sub_prop: { inner_prop: value } }] }
                        nestedEntity[nameParts[0]] = [];
                    } else {
                        // Second nested level is an array
                        // ex1: { my_prop: { sub_prop: [value] } }
                        // ex2: { my_prop: { sub_prop: [{ inner_prop: value }] } }
                        nestedEntity[nameParts[0]] = {};
                    }
                }
                // Iterate over flattened values
                for (let i = 0; i < dsEntity[propName].length; i++) {
                    if (nestedEntity[nameParts[0]] instanceof Array) {
                        // cases: ex3 and ex4
                        if (nestedEntity[nameParts[0]].length <= i) {
                            nestedEntity[nameParts[0]].push({});
                        }
                        if (nameParts.length === 2) {
                            // case ex3
                            nestedEntity[nameParts[0]][i][nameParts[1]] = dsEntity[propName][i];
                        } else {
                            // case ex4
                            if (!nestedEntity[nameParts[0]][i][nameParts[1]]) {
                                nestedEntity[nameParts[0]][i][nameParts[1]] = {};
                            }
                            nestedEntity[nameParts[0]][i][nameParts[1]][nameParts[2]] = dsEntity[propName][i];
                        }
                    } else {
                        // cases: ex1 and ex2
                        if (!nestedEntity[nameParts[0]][nameParts[1]]) {
                            nestedEntity[nameParts[0]][nameParts[1]] = [];
                        }
                        if (nameParts.length === 2) {
                            // case ex1
                            nestedEntity[nameParts[0]][nameParts[1]].push(dsEntity[propName][i]);
                        } else {
                            // case ex2
                            if (nestedEntity[nameParts[0]][nameParts[1]].length <= i) {
                                nestedEntity[nameParts[0]][nameParts[1]].push({});
                            }
                            nestedEntity[nameParts[0]][nameParts[1]][i][nameParts[2]] = dsEntity[propName][i];
                        }
                    }
                }
            } else {
                if (!nestedEntity[nameParts[0]]) {
                    nestedEntity[nameParts[0]] = {};
                }
                if (nameParts.length === 2) {
                    // one level nested value
                    // ex: my_prop.sub_prop = value -> { my_prop: { sub_prop: value } }
                    nestedEntity[nameParts[0]][nameParts[1]] = dsEntity[propName];
                } else {
                    // two level nested value
                    // ex: my_prop.sub_prop.inner_prop -> { my_prop: { sub_prop: { inner_prop: value } } }
                    if (!nestedEntity[nameParts[0]][nameParts[1]]) {
                        nestedEntity[nameParts[0]][nameParts[1]] = {};
                    }
                    nestedEntity[nameParts[0]][nameParts[1]][nameParts[2]] = dsEntity[propName];
                }
            }
        } else {
            // Property name does not indicate that it holds flattened nested values
            nestedEntity[propName] = dsEntity[propName];
        }
    }
    if (!foundNestedProperty) {
        // If no nested property found we can return the original object to prevent useless editions
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
