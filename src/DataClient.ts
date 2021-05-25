import * as datastore from '@google-cloud/datastore';
import { RunQueryOptions } from '@google-cloud/datastore/build/src/query';
import { CommitResponse } from '@google-cloud/datastore/build/src/request';
import { ClassConstructor } from 'class-transformer';

import { Key, Entity } from './models';
import { ICacheClient, ICacheStringArray, ICacheStringMap, NoCacheClient } from './cache';

/**
 * DataClient for interacting with the underlying datastore and cache layer
 * This class basically wraps datastore calls from https://github.com/googleapis/nodejs-datastore and the specified
 * cache client calls.
 *
 * A DataClient instance should be used as a singleton and considered thread safe.
 *
 * ```typescript
 * // Default datastore uses a no cache policy and the default datastore credentials such as the one available in the environment
 * const cltNoCache = new DataClient();
 *
 * // The main provided cache client is redis
 * const cltRedisCache = new DataClient({}, new RedisCacheClient());
 * ```
 */
export class DataClient {
    datastoreClient: datastore.Datastore;
    cacheClient: ICacheClient;
    transaction?: datastore.Transaction;

    /**
     * Creates the underlying datastore instance by forwarding it the specified client options
     *
     * @param datastoreOptions datastore client options
     * @param cacheClient cache client instance
     * @param cloneClient mostly used internally to clone the client during transactions
     */
    constructor(datastoreOptions?: datastore.DatastoreOptions, cacheClient?: ICacheClient, cloneClient?: DataClient) {
        if (cloneClient) {
            this.datastoreClient = cloneClient.datastoreClient;
            this.cacheClient = cloneClient.cacheClient;
        } else {
            this.datastoreClient = new datastore.Datastore(datastoreOptions);
            this.cacheClient = cacheClient || new NoCacheClient();
        }
    }

    /**
     * Terminates the underlying datastore client as well as the cache client
     */
    close = async () => {
        await this.cacheClient.close();
    };

    /**
     * Create a clone of the client with an initialized transaction
     * The transacation calls to run and commit are not handled by this method
     *
     * @param options optional transaction options
     * @returns a clone of the current client with an initialized transaction
     */
    newTransactionClient = (options?: datastore.TransactionOptions): DataClient => {
        const clt = new DataClient(undefined, undefined, this);
        clt.transaction = clt.datastoreClient.transaction(options);
        return clt;
    };

    /**
     * Encodes a key into a string key useable by the cache layer
     *
     * @param key the key to encode
     */
    cacheKeyFromDatastoreKey = async (key: Key): Promise<string> => {
        const safeKey = await key.encode(this.datastoreClient);
        return 'NDC:' + safeKey;
    };

    /**
     * Encodes an array of keys into string keys useable by the cache layer
     * @param keys the keys to encode
     */
    cacheKeysFromDatastoreKeys = async (keys: Key[]): Promise<string[]> => {
        const cacheKeys = await Promise.all(
            keys.map(async (k) => {
                return await this.cacheKeyFromDatastoreKey(k);
            }),
        );
        return cacheKeys;
    };

    /**
     * Allocate new unique Key using datastore auto-generated numeric IDs.
     *
     * @param kind Kind for each keys
     * @param nbr Number of keys to allocate
     * @returns The newly allocated keys
     */
    allocateIds = async (kind: string, nbr: number): Promise<Key[]> => {
        const [keys] = await this._req().allocateIds(Key.incompleteKey(kind).toDatastore(), nbr);
        return keys.map((k) => Key.fromDatastore(k));
    };

    /**
     * Get an entity by key
     * Set the cache data associated with the entity
     *
     * @param key the key to get
     * @param cls the class to transform the result into
     * @param options datastore query options
     * @returns Either the entity or null if not found
     */
    get = async <T extends Entity>(key: Key, cls: ClassConstructor<T>, options?: RunQueryOptions): Promise<T | null> => {
        // Fetched cached results
        const cacheKey = await this.cacheKeyFromDatastoreKey(key);
        if (!this.transaction) {
            const cached = await this.cacheClient.get(cacheKey);
            if (cached) {
                return Entity.fromPlain(JSON.parse(cached as string), cls);
            }
        }
        // Fetch datastore result
        const [e] = await this._req().get(key.toDatastore(), options);
        if (e) {
            // Save result into cache
            const res = Entity.fromDatastore(e, cls);
            await this.cacheClient.set(cacheKey, JSON.stringify(await res.toPlain(this.datastoreClient)));
            return res;
        }
        return e || null;
    };

    /**
     * Create or update an entity into the datastore
     * Delete the cache data associated with this entity
     *
     * @param entity the entity to save
     */
    save = async (entity: Entity): Promise<void> => {
        if (!entity.key) {
            throw new Error('cannot save entity without key');
        }
        const datastoreEntity = entity.toDatastore();
        await this._req().save(datastoreEntity);
        if (entity.key.id === undefined && datastoreEntity.key.id !== undefined) {
            entity.key.id = parseInt(datastoreEntity.key.id);
        }
        await this.cacheClient.del(await this.cacheKeyFromDatastoreKey(entity.key));
    };

    /**
     * Delete the entity associated with this key
     * Delete the cache data associated with this key
     *
     * @param key the entity key to delete
     */
    delete = async (key: Key): Promise<void> => {
        await this._req().delete(key.toDatastore());
        await this.cacheClient.del(await this.cacheKeyFromDatastoreKey(key));
    };

    /**
     * Get an array of entity by keys
     * Set the cache data associated with the entities
     *
     * @param keys the keys to get
     * @param cls the class to transform the results into
     * @param options datastore query options
     * @returns An array containing either the fetched entity or null for each requested key
     */
    getMulti = async <T extends Entity>(keys: Key[], cls: ClassConstructor<T>, options?: RunQueryOptions): Promise<Array<T | null>> => {
        const result: { [key: string]: T } = {};
        const cacheKeys = await this.cacheKeysFromDatastoreKeys(keys);
        let cached: ICacheStringArray = [];

        if (!this.transaction) {
            // Fetched cached results
            cached = await this.cacheClient.mget(cacheKeys);
        }

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
        const [dsEntities] = await this._req().get(missingDsKeys, options);
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

    /**
     * Create or update the entities into the datastore
     * Delete the cache data associated with those entities
     *
     * @param entities the entities to save
     */
    saveMulti = async (entities: Entity[]): Promise<void> => {
        const datastoreEntities = entities.map((e) => e.toDatastore());
        await this._req().save(datastoreEntities);
        for (let i = 0; i < entities.length; i++) {
            const e = entities[i];
            const dse = datastoreEntities[i];
            if (e.key && e.key.id === undefined && dse.key.id !== undefined) {
                e.key.id = parseInt(dse.key.id);
            }
        }
        await this.cacheClient.mdel(await this.cacheKeysFromDatastoreKeys(entities.map((e) => e.key as Key)));
    };

    /**
     * Delete the entities associated with those keys
     * Delete the cache data associated with those key
     *
     * @param key the entity key to delete
     */
    deleteMulti = async (keys: Key[]): Promise<void> => {
        await this._req().delete(keys);
        await this.cacheClient.mdel(await this.cacheKeysFromDatastoreKeys(keys));
    };

    /**
     * Create a new query instance
     *
     * @param kind datastore entity kind
     * @param namespace datastore namespace
     * @returns a new query instance
     */
    createQuery = (kind?: string, namespace?: string) => {
        if (namespace && kind) {
            if (this.transaction) {
                return this.transaction.createQuery(namespace, kind);
            }
            return this.datastoreClient.createQuery(namespace, kind);
        }
        if (this.transaction) {
            return this.transaction.createQuery(kind);
        }
        return this.datastoreClient.createQuery(kind);
    };

    /**
     * Run a query and returns the fetched entities
     *
     * This does not use any cache capability in order to maintain consistency
     * Using this method is not recommended as it does not beneficiate from the cache layer
     * Better use runKeysOnlyQuery followed by getMulti
     *
     * @param cls the class to transform the results into
     * @param query the query to run
     * @param maxResults optional maximum number of results
     * @param startCursor optional start cursor for paginated results
     * @param options datastore query options
     * @returns an array of fetched entities, the next page cursor and whether or not more results might exist
     */
    runQuery = async <T extends Entity>(
        cls: ClassConstructor<T>,
        query: datastore.Query,
        maxResults?: number,
        startCursor?: string,
        options?: RunQueryOptions,
    ): Promise<[T[], string | undefined, boolean]> => {
        let qry = query;
        if (maxResults) {
            qry = qry.limit(maxResults);
        }
        if (startCursor) {
            qry = qry.start(startCursor);
        }
        const [entities, qryInfo] = await this._req().runQuery(qry, options);
        return [entities.map((e) => Entity.fromDatastore(e, cls)), qryInfo.endCursor, maxResults !== undefined && entities.length === maxResults];
    };

    /**
     * Run a query and returns the fetched keys
     *
     * Better use this method followed by a getMulti than use the runQuery in order to leverage cache capabilities
     *
     * @param query the query to run
     * @param maxResults optional maximum number of results
     * @param startCursor optional start cursor for paginated results
     * @param options datastore query options
     * @returns an array of fetched keys, the next page cursor and whether or not more results might exist
     */
    runKeysOnlyQuery = async (query: datastore.Query, maxResults?: number, startCursor?: string, options?: RunQueryOptions): Promise<[Key[], string | undefined, boolean]> => {
        let qry = query.select('__key__');
        if (maxResults) {
            qry = qry.limit(maxResults);
        }
        if (startCursor) {
            qry = qry.start(startCursor);
        }
        const [entities, qryInfo] = await this._req().runQuery(qry, options);
        return [entities.map((e) => Key.fromDatastore(e[this.datastoreClient.KEY])), qryInfo.endCursor, maxResults !== undefined && entities.length === maxResults];
    };

    /**
     * Run the provided function into a datastore transaction.
     * This method will create the transaction and commit it once fn() finishes
     *
     * ```typescript
     * // Create a basic client
     * const clt = new DataClient();
     *
     * // Create an entity only if it does not exist in the datastore
     * this.runInTransaction((tx) => {
     *     const key = Key.nameKey('MyEntity', 'my-entity-id');
     *     const e = tx.get(key, MyEntity);
     *     if (!e) {
     *         tx.save(new MyEntity({ key }));
     *     }
     * });
     * ```
     *
     * @param fn the function to execute within a transaction context
     * @param options optional transaction options
     */
    runInTransaction = async (fn: (tx: DataClient) => Promise<Error | void>, options?: datastore.TransactionOptions): Promise<CommitResponse> => {
        const tx = this.newTransactionClient(options);
        await (tx.transaction as datastore.Transaction).run();
        const err = await fn(tx);
        if (err) {
            await (tx.transaction as datastore.Transaction).rollback();
            throw err;
        }
        return await (tx.transaction as datastore.Transaction).commit();
    };

    /**
     * Get the current request provider, either the ongoing transaction or the datastore client
     */
    _req = (): datastore.DatastoreRequest => {
        return this.transaction || this.datastoreClient;
    };
}
