import * as redis from 'redis';

import { CacheClientEvent, ICacheClient, ICacheString, ICacheStringArray, ICacheStringMap } from '../interfaces';

/**
 * Redis cache layer implementation using https://github.com/NodeRedis/node-redis
 */
export class RedisCacheClient implements ICacheClient {
    client: redis.RedisClient;
    eventsCallback: (event: CacheClientEvent) => void;

    /**
     * Creates the underlying redis client by forwarding it the specified client options
     * An events callback can also be specified here or later by calling the events method (see method details for more information)
     *
     * @param options redis client options
     * @param eventsCallback events callback
     */
    constructor(options?: redis.ClientOpts, eventsCallback?: (event: CacheClientEvent) => void) {
        if (eventsCallback) {
            this.eventsCallback = eventsCallback;
        } else {
            this.eventsCallback = () => {};
        }

        this.client = new redis.RedisClient(options || {});

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
     * Terminates the client connection to the redis server
     */
    close = async () => {
        return new Promise<void>((resolve) => {
            this.client.end(true);
            resolve();
        });
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
        return new Promise<ICacheString>((resolve, reject) => {
            this.client.get(key, (err: Error | null, reply: ICacheString) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });
    };

    /**
     * Get data by keys
     *
     * @param keys an array of redis keys
     */
    mget = async (keys: Array<string>): Promise<ICacheStringArray> => {
        return new Promise<ICacheStringArray>((resolve, reject) => {
            if (keys.length === 0) {
                resolve([]);
                return;
            }
            this.client.mget(keys, (err: Error | null, reply: ICacheStringArray) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve(reply);
                }
            });
        });
    };

    /**
     * Set data by key
     *
     * @param key a redis key
     * @param value the value to store in redis
     * @param expiresInSec the optional expiration time for the key in seconds (must be > 0 to be taken into account)
     */
    set = async (key: string, value: string, expiresInSec?: number) => {
        return new Promise<void>((resolve, reject) => {
            if (expiresInSec && expiresInSec > 0) {
                this.client.setex(key, expiresInSec, value, (err: Error | null) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                this.client.set(key, value, (err: Error | null) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    };

    /**
     * Set multiple keys associated data
     *
     * @param kvs a map of key value to store in redis
     */
    mset = async (kvs: ICacheStringMap) => {
        return new Promise<void>((resolve, reject) => {
            const args: string[] = [];
            for (const k in kvs) {
                args.push(k);
                args.push(kvs[k]);
            }
            if (args.length === 0) {
                resolve();
                return;
            }
            this.client.mset(...args, (err: Error | null) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    /**
     * Deletes the value stored in redis at the specified key
     *
     * @param key a redis key
     */
    del = async (key: string) => {
        return new Promise<void>((resolve, reject) => {
            this.client.del(key, (err: Error | null) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    /**
     * Deletes the value stored in redis at the specified keys
     *
     * @param keya an array of redis keys
     */
    mdel = async (keys: Array<string>) => {
        return new Promise<void>((resolve, reject) => {
            this.client.del(keys, (err: Error | null) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };
}
