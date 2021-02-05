import * as redis from 'redis';

import { CacheClientEvent, ICacheClient, ICacheString, ICacheStringArray, ICacheStringMap } from '../interfaces';

export class RedisCacheClient implements ICacheClient {
    client: redis.RedisClient;
    eventsCallback: (event: CacheClientEvent) => void;

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

    close = async () => {
        return new Promise<void>((resolve) => {
            this.client.end(true);
            resolve();
        });
    };

    events = async (callback: (event: CacheClientEvent) => void) => {
        this.eventsCallback = callback;
    };

    get = async (key: string) => {
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

    mget = async (keys: Array<string>) => {
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

    set = async (key: string, value: string) => {
        return new Promise<void>((resolve, reject) => {
            this.client.set(key, value, (err: Error | null) => {
                if (err !== null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

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
