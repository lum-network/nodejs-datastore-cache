import * as datastore from '@google-cloud/datastore';
import { RunQueryOptions } from '@google-cloud/datastore/build/src/query';

import { Key, Entity } from '.';
import { ICacheClient, NoCacheClient } from './cache';

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

    get = async (key: Key, options?: RunQueryOptions): Promise<Entity> => {
        const res = await this.getMulti([key], options);
        return res[0];
    };

    getMulti = async (keys: Key[], options?: RunQueryOptions): Promise<Entity[]> => {
        // Fetched cached results
        const cached = await this.cacheClient.mget(await this.cacheKeysFromDatastoreKeys(keys));
        // Build missing keys list to fetch from datastore
        const missingKeys = [];
        for (let c = 0; c < cached.length; c++) {
            if (!cached[c]) {
                missingKeys.push(keys[c]);
            }
        }
        // Fetch datastore results
        const [entities] = await this.datastoreClient.get(
            missingKeys.map((k) => k.toDatastore()),
            options,
        );
        // Merge cached and datastore results
        const result = [];
        let d = 0;
        for (let k = 0; k < keys.length; k++) {
            if (cached[k]) {
                result.push(cached[k]);
            } else {
                result.push(entities[d] || null);
                d++;
            }
        }
        // Save results into cache
        // TODO
        return result;
    };
}
