import * as datastore from '@google-cloud/datastore';
import { RunQueryOptions } from '@google-cloud/datastore/build/src/query';
import { ClassConstructor } from 'class-transformer';

import { Key, Entity } from './models';
import { ICacheClient, ICacheStringMap, NoCacheClient } from './cache';

export class DataClient {
    datastoreClient: datastore.Datastore;
    cacheClient: ICacheClient;

    constructor(datastoreOptions?: datastore.DatastoreOptions, cacheClient?: ICacheClient) {
        this.datastoreClient = new datastore.Datastore(datastoreOptions);
        this.cacheClient = cacheClient || new NoCacheClient();
    }

    cacheKeyFromDatastoreKey = async (key: Key): Promise<string> => {
        const safeKey = await key.encode(this.datastoreClient);
        return 'NDC:' + safeKey;
    };

    cacheKeysFromDatastoreKeys = async (keys: Key[]): Promise<string[]> => {
        const cacheKeys = await Promise.all(
            keys.map(async (k) => {
                return await this.cacheKeyFromDatastoreKey(k);
            }),
        );
        return cacheKeys;
    };

    close = async () => {
        await this.cacheClient.close();
    };

    get = async <T extends Entity>(key: Key, cls: ClassConstructor<T>, options?: RunQueryOptions): Promise<T | null> => {
        // Fetched cached results
        const cacheKey = await this.cacheKeyFromDatastoreKey(key);
        const cached = await this.cacheClient.get(cacheKey);
        if (cached) {
            return Entity.fromPlain(JSON.parse(cached as string), cls);
        }
        // Fetch datastore result
        const [e] = await this.datastoreClient.get(key.toDatastore(), options);
        if (e) {
            // Save result into cache
            const res = Entity.fromDatastore(e, cls);
            await this.cacheClient.set(cacheKey, JSON.stringify(await res.toPlain(this.datastoreClient)));
            return res;
        }
        return e || null;
    };

    save = async (entity: Entity): Promise<void> => {
        if (!entity.key) {
            throw new Error('cannot save entity without key');
        }
        const datastoreEntity = entity.toDatastore();
        await this.datastoreClient.save(datastoreEntity);
        if (entity.key.id === undefined && datastoreEntity.key.id !== undefined) {
            entity.key.id = parseInt(datastoreEntity.key.id);
        }
        await this.cacheClient.del(await this.cacheKeyFromDatastoreKey(entity.key));
    };

    delete = async (key: Key): Promise<void> => {
        await this.datastoreClient.delete(key.toDatastore());
        await this.cacheClient.del(await this.cacheKeyFromDatastoreKey(key));
    };

    getMulti = async <T extends Entity>(keys: Key[], cls: ClassConstructor<T>, options?: RunQueryOptions): Promise<Array<T | null>> => {
        const result: { [key: string]: T } = {};

        // Fetched cached results
        const cacheKeys = await this.cacheKeysFromDatastoreKeys(keys);
        const cached = await this.cacheClient.mget(cacheKeys);

        // Save cached result and build missing keys list
        const missingDsKeys = [];
        for (let i = 0; i < keys.length; i++) {
            if (cached[i]) {
                result[cacheKeys[i]] = Entity.fromPlain(JSON.parse(cached[i] as string), cls);
            } else {
                missingDsKeys.push(keys[i].toDatastore());
            }
        }

        // Fetch missing entities from datastore
        const [dsEntities] = await this.datastoreClient.get(missingDsKeys, options);
        for (let i = 0; i < dsEntities.length; i++) {
            const dsEntity = dsEntities[i];
            if (dsEntity) {
                const e = Entity.fromDatastore(dsEntity, cls);
                result[await this.cacheKeyFromDatastoreKey(e.key as Key)] = e;
            }
        }

        // Update cache
        const newCache: ICacheStringMap = {};
        for (const k in result) {
            if (result[k]) {
                newCache[k] = JSON.stringify(await result[k].toPlain(this.datastoreClient));
            }
        }
        await this.cacheClient.mset(newCache);

        return cacheKeys.map((k: string) => result[k] || null);
    };

    saveMulti = async (entities: Entity[]): Promise<void> => {
        const datastoreEntities = entities.map((e) => e.toDatastore());
        await this.datastoreClient.save(datastoreEntities);
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            const dse = datastoreEntities[i];
            if (e.key && e.key.id === undefined && dse.key.id !== undefined) {
                e.key.id = parseInt(dse.key.id);
            }
        }
        await this.cacheClient.mdel(await this.cacheKeysFromDatastoreKeys(entities.map((e) => e.key as Key)));
    };

    deleteMulti = async (keys: Key[]): Promise<void> => {
        await this.datastoreClient.delete(keys);
        await this.cacheClient.mdel(await this.cacheKeysFromDatastoreKeys(keys));
    };
}
