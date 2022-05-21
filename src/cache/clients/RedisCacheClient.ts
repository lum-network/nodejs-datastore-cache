import { createClient, RedisClientOptions, RedisClientType, RedisModules, RedisFunctions, RedisScripts } from 'redis';

import { CacheClientEvent, ICacheClient, ICacheString, ICacheStringArray, ICacheStringMap } from '../interfaces';

/**
 * Redis cache layer implementation using https://github.com/NodeRedis/node-redis
 */
export class RedisCacheClient implements ICacheClient {
    client: RedisClientType<RedisModules, RedisFunctions, RedisScripts>;
    eventsCallback: (event: CacheClientEvent) => void;

    /**
     * Creates the underlying redis client by forwarding it the specified client options
     * An events callback can also be specified here or later by calling the events method (see method details for more information)
     *
     * @param options redis client options
     * @param eventsCallback events callback
     */
    constructor(options?: RedisClientOptions<RedisModules, RedisFunctions, RedisScripts>, eventsCallback?: (event: CacheClientEvent) => void) {
        if (eventsCallback) {
            this.eventsCallback = eventsCallback;
        } else {
            this.eventsCallback = () => {};
        }

        this.client = createClient(options || {});

        this.client.on('ready', () => {
            this.eventsCallback(CacheClientEvent.Ready);
        });
        this.client.on('connect', () => {
            this.eventsCallback(CacheClientEvent.Connected);
        });
        this.client.on('end', () => {
            this.eventsCallback(CacheClientEvent.Closed);
        });
        this.client.on('reconnecting', () => {
            this.eventsCallback(CacheClientEvent.Reconnecting);
        });
    }

    /**
     * Opens the client connection to the redis server
     */
    connect = async () => {
        await this.client.connect();
    };

    /**
     * Terminates the client connection to the redis server
     * Gracefully closes the connection using quit which waits for pending commands to finish
     */
    disconnect = async () => {
        await this.client.quit();
    };

    /**
     * Register an events callback (same as mentionned in the constructor)
     * Only one callback is supported at a time. Multiple subsequent calls will simply override the callback.
     *
     * The callback will eventually receive all the events specified by the CacheClientEvent enum.
     *
     * @param callback events callback
     */
    events = async (callback: (event: CacheClientEvent) => void) => {
        this.eventsCallback = callback;
    };

    /**
     * Get data by key
     *
     * @param key a redis key
     */
    get = async (key: string): Promise<ICacheString> => {
        return this.client.get(key);
    };

    /**
     * Get data by keys
     *
     * @param keys an array of redis keys
     */
    mget = async (keys: Array<string>): Promise<ICacheStringArray> => {
        if (keys.length === 0) {
            return [];
        }
        return this.client.mGet(keys);
    };

    /**
     * Set data by key
     *
     * @param key a redis key
     * @param value the value to store in redis
     * @param expiresInSec the optional expiration time for the key in seconds (must be > 0 to be taken into account)
     * @param onlySetIfNotExist optional set only if value does not exist in cache
     */
    set = async (key: string, value: string, expiresInSec?: number, onlySetIfNotExist?: boolean): Promise<boolean> => {
        const res = await this.client.set(key, value, {
            'EX': expiresInSec && expiresInSec > 0 ? expiresInSec : undefined,
            'NX': onlySetIfNotExist === true ? true : undefined,
        });
        return res === 'OK';
    };

    /**
     * Set multiple keys associated data
     *
     * @param kvs a map of key value to store in redis
     */
    mset = async (kvs: ICacheStringMap) => {
        if (Object.keys(kvs).length === 0) {
            return;
        }
        const res = await this.client.mSet(kvs);
        if (res !== 'OK') {
            throw Error(`redis MSET failed with error ${res}`);
        }
    };

    /**
     * Deletes the value stored in redis at the specified key
     *
     * @param key a redis key
     */
    del = async (key: string) => {
        await this.client.del(key);
    };

    /**
     * Deletes the value stored in redis at the specified keys
     *
     * @param keya an array of redis keys
     */
    mdel = async (keys: Array<string>) => {
        if (keys.length === 0) {
            return;
        }
        await this.client.del(keys);
    };
}
