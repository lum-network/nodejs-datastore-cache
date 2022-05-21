import { CacheClientEvent, ICacheString, ICacheStringArray, ICacheStringMap } from './ICacheTypes';

export interface ICacheClient {
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    events: (callback: (event: CacheClientEvent) => void) => Promise<void>;
    get: (key: string) => Promise<ICacheString>;
    mget: (keys: Array<string>) => Promise<ICacheStringArray>;
    set: (key: string, value: string, expiresInSec?: number) => Promise<void>;
    mset: (kvs: ICacheStringMap) => Promise<void>;
    del: (key: string) => Promise<void>;
    mdel: (key: Array<string>) => Promise<void>;
}
