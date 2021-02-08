import * as datastore from '@google-cloud/datastore';
import { Type, Expose, ClassTransformOptions, classToPlain, plainToClass } from 'class-transformer';

const cto: ClassTransformOptions = { strategy: 'excludeAll' };

export class Key {
    @Expose()
    kind: string;

    @Expose()
    @Type(() => Number)
    id?: number;

    @Expose()
    name?: string;

    @Expose()
    namespace?: string;

    @Expose()
    @Type(() => Key)
    parent?: Key;

    constructor(kind: string, id?: number, name?: string, namespace?: string, parent?: Key) {
        this.kind = kind;
        this.id = id;
        this.name = name;
        this.namespace = namespace;
        this.parent = parent;
    }

    static nameKey = (kind: string, name: string, namespace?: string, parent?: Key): Key => {
        return new Key(kind, undefined, name, namespace, parent);
    };

    static idKey = (kind: string, id: number, namespace?: string, parent?: Key): Key => {
        return new Key(kind, id, undefined, namespace, parent);
    };

    static incompleteKey = (kind: string, namespace?: string, parent?: Key): Key => {
        return new Key(kind, undefined, undefined, namespace, parent);
    };

    static fromDatastore = (key: datastore.Key): Key => {
        return new Key(key.kind, key.id ? parseInt(key.id) : undefined, key.name, key.namespace, key.parent ? Key.fromDatastore(key.parent) : undefined);
    };

    static decode = (store: datastore.Datastore, encodedKey: string): Key => {
        return Key.fromDatastore(store.keyFromLegacyUrlsafe(encodedKey));
    };

    static fromPlain = (plain: { [key: string]: any }): Key => {
        return plainToClass(Key, plain, cto);
    };

    @Expose({ name: 'path' })
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

    toDatastore = (): datastore.Key => {
        return new datastore.Key({
            namespace: this.namespace,
            path: this.path(),
        });
    };

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

    toPlain = (): { [key: string]: any } => {
        return classToPlain(this, cto);
    };
}
