import { ICacheClient } from '../interfaces';

export class NoCacheClient implements ICacheClient {
    close = async () => {
        return;
    };

    events = async () => {
        return;
    };

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
}
