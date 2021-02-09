import * as datastore from '@google-cloud/datastore';
import { entity } from '@google-cloud/datastore/build/src/entity';

import { Type, Expose, ClassTransformOptions, classToPlain, plainToClass, ExposeOptions, Transform } from 'class-transformer';
import { Persist, PersistStruct } from './decorators';

const cto: ClassTransformOptions = { strategy: 'excludeAll' };

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
export class Key {
    @Persist()
    kind: string;

    @PersistStruct(() => Number)
    id?: number;

    @Persist()
    name?: string;

    @Persist()
    namespace?: string;

    @PersistStruct(() => Key)
    parent?: Key;

    @Persist({ name: 'path' })
    path = (): Array<string | number> => {
        let path: Array<string | number> = [];
        if (this.parent) {
            path = this.parent.path();
        }
        if (this.id) {
            path = path.concat([this.kind, this.id]);
        } else if (this.name) {
            path = path.concat([this.kind, this.name]);
        } else {
            path = path.concat([this.kind]);
        }
        return path;
    };

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
        this.kind = kind;
        this.id = id;
        this.name = name;
        this.namespace = namespace;
        this.parent = parent;
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
        return plainToClass(Key, plain, cto);
    };

    /**
     * Converts the current Key instance into a datastore key instance usable for direct datastore calls
     * such as save.
     */
    toDatastore = (): datastore.Key => {
        return new datastore.Key({
            namespace: this.namespace,
            path: this.path(),
        });
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
            if (locationPrefix) {
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
        return classToPlain(this, cto);
    };
}
