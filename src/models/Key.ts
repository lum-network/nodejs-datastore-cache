import * as datastore from '@google-cloud/datastore';
import { entity } from '@google-cloud/datastore/build/src/entity';

import { Type, Expose, classToPlain, plainToClass, ExposeOptions, Transform, Exclude } from 'class-transformer';
import { Persist, PersistStruct } from './decorators';

const urlSafeKeyHelper = new entity.URLSafeKey();

/**
 * Decorator used to persist a datastore key
 * Using another decorator to persist key will result in unpredictable behaviour
 *
 * @param options
 */
export const PersistKey = (options: ExposeOptions = {}): PropertyDecorator => {
    return (object: any, propertyName?: string | Symbol): void => {
        Type(() => Key)(object, propertyName as string);
        Expose(options)(object, propertyName as string);
        Transform(({ value }) => value && Key.fromPlain(value), { toClassOnly: true })(object, propertyName as string);
    };
};

/**
 * Wrapper class to build datastore Keys
 *
 * ```typescript
 * // Create a new key using its id (integer) or name (string)
 * const k1 = Key.nameKey('MyEntity', 'my-unique-name');
 * const k2 = Key.idKey('MyEntity', 1);
 *
 * // Create an incomplete key (the id will be provided when saving the entity) with a namespace and parent
 * const k3 = Key.incompleteKey(
 *   'MyEntity',
 *   'pvt-namespace',
 *    Key.nameKey('MyParentEntity', 'my-unique-parent-name', 'pvt-namespace'),
 * )
 * ```
 */
@Exclude()
export class Key {
    key: datastore.Key;

    @Persist({ name: 'kind' })
    get kind(): string {
        return this.key.kind;
    }
    set kind(kind: string) {
        if (!this.key) {
            this.path = [];
        }
        this.key.kind = kind;
    }

    @PersistStruct(() => Number, { name: 'id' })
    get id(): number | undefined {
        if (this.key.id) {
            return parseInt(this.key.id);
        }
        return undefined;
    }
    set id(id: number | undefined) {
        if (!this.key) {
            this.path = [];
        }
        this.key.id = id ? id.toString() : undefined;
    }

    @Persist({ name: 'name' })
    get name(): string | undefined {
        return this.key.name;
    }
    set name(name: string | undefined) {
        if (!this.key) {
            this.path = [];
        }
        this.key.name = name;
    }

    @Persist({ name: 'namespace' })
    get namespace(): string | undefined {
        return this.key.namespace;
    }
    set namespace(namespace: string | undefined) {
        if (!this.key) {
            this.path = [];
        }
        this.key.namespace = namespace;
    }

    @PersistStruct(() => Key)
    get parent(): Key | undefined {
        if (this.key.parent) {
            return Key.fromDatastore(this.key.parent);
        }
        return undefined;
    }
    set parent(key: Key | undefined) {
        if (!this.key) {
            this.path = [];
        }
        this.key.parent = key ? key.toDatastore() : undefined;
    }

    @Persist({ name: 'path' })
    get path(): Array<string | number> {
        return this.key.path;
    }
    set path(path: Array<string | number>) {
        if (this.id && path && path.length > 0 && path[path.length - 1] === this.id.toString()) {
            // Fix id being passed in the path as strings which confuses our setup
            // this happens when using plainToClass(datastore.Key, Key) if the key is an ID key
            path[path.length - 1] = this.id;
        }
        this.key = new datastore.Key({ namespace: this.namespace, path: path });
    }

    /**
     * Create a new entity according to the provided params
     *
     * @param kind Entity kind
     * @param id Entity integer ID
     * @param name Entity string Name
     * @param namespace Entity namespace
     * @param parent Entity parent
     */
    constructor(kind: string, id?: number, name?: string, namespace?: string, parent?: Key) {
        const path = parent ? parent.path : [];
        path.push(kind);
        if (id) {
            path.push(id);
        } else if (name) {
            path.push(name);
        }
        this.key = new datastore.Key({ namespace, path });
    }

    /**
     * Create a new key by name (string) ID
     *
     * @param kind Entity kind
     * @param name Entity name
     * @param namespace Entity namespace
     * @param parent Entity parent
     */
    static nameKey = (kind: string, name: string, namespace?: string, parent?: Key): Key => {
        return new Key(kind, undefined, name, namespace, parent);
    };

    /**
     * Create a new key by ID (integer)
     *
     * @param kind Entity kind
     * @param id Entity ID
     * @param namespace Entity namespace
     * @param parent Entity parent
     */
    static idKey = (kind: string, id: number, namespace?: string, parent?: Key): Key => {
        return new Key(kind, id, undefined, namespace, parent);
    };

    /**
     * Create an incomplete key. The key ID will be set once saved into the datastore
     * Warning: The DataClient will save the new ID into the Key instance automatically, if you use another client you must do it manually.
     *
     * @param kind Entity kind
     * @param namespace Entity namespace
     * @param parent Entity parent
     */
    static incompleteKey = (kind: string, namespace?: string, parent?: Key): Key => {
        return new Key(kind, undefined, undefined, namespace, parent);
    };

    /**
     * Create a new Key instance based on the provided datastore key
     *
     * @param key key from the datastore module
     */
    static fromDatastore = (key: datastore.Key): Key => {
        return new Key(key.kind, key.id ? parseInt(key.id) : undefined, key.name, key.namespace, key.parent ? Key.fromDatastore(key.parent) : undefined);
    };

    /**
     * Create a new Key instance based on an encoded key
     * This feature is cross-compatible with other datastore sdk languages such as Python only if you use the same
     * datastore and key configuration.
     *
     * @param encodedKey The previously encoded key
     */
    static decode = (encodedKey: string): Key => {
        return Key.fromDatastore(urlSafeKeyHelper.legacyDecode(encodedKey));
    };

    /**
     * Create a Key instance from a plain javascript object or an encoded string key
     *
     * @param plain a plain object or a string encoded key
     */
    static fromPlain = (plain: { [key: string]: any } | string): Key => {
        if (typeof plain === 'string') {
            return Key.decode(plain);
        }
        return plainToClass(Key, plain);
    };

    /**
     * Converts the current Key instance into a datastore key instance usable for direct datastore calls
     * such as save.
     */
    toDatastore = (): datastore.Key => {
        return this.key;
    };

    /**
     * Encode the Key instance into an urlsafe string
     * This feature is cross-compatible with other datastore sdk languages such as Python only if you use the same
     * datastore and key configuration.
     *
     * @param store A datastore instance
     * @param locationPrefix An optional location prefix
     */
    encode = async (store: datastore.Datastore, locationPrefix?: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!store) {
                // Fix an issue with class transformer auto generation behaviour
                resolve('');
            } else if (locationPrefix) {
                store.keyToLegacyUrlSafe(this.toDatastore(), locationPrefix, (err, d) => {
                    if (err || !d) {
                        reject(err);
                    } else {
                        resolve(d);
                    }
                });
            } else {
                store.keyToLegacyUrlSafe(this.toDatastore(), (err, d) => {
                    if (err || !d) {
                        reject(err);
                    } else {
                        resolve(d);
                    }
                });
            }
        });
    };

    /**
     * Converts the Key instance into a plain object
     */
    toPlain = (): { [key: string]: any } => {
        return classToPlain(this);
    };
}
