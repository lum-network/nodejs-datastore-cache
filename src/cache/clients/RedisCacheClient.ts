import * as redis from 'redis';

import { ICacheClient } from '../interfaces/ICacheClient';
import { ICacheString, ICacheStringArray, ICacheStringMap } from '../interfaces/ICacheTypes';

export class RedisCacheClient implements ICacheClient {
    client: redis.RedisClient;

    constructor(options?: redis.ClientOpts) {
        this.client = new redis.RedisClient(options || {});
    }

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

    close = async () => {
        return new Promise<void>((resolve) => {
            this.client.end(true);
            resolve();
        });
    };
}
