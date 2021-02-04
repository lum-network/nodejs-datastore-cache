import { ICacheClient } from '../interfaces/ICacheClient';

export class NoCacheClient implements ICacheClient {
    get = async () => {
        return null;
    };

    mget = async (keys: Array<string>) => {
        return keys.map(() => null);
    };

    set = async () => {
        return;
    };

    mset = async () => {
        return;
    };

    del = async () => {
        return;
    };

    mdel = async () => {
        return;
    };

    close = async () => {
        return;
    };
}
