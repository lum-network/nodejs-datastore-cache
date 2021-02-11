import { ICacheClient } from '../interfaces';

/**
 * Always returns empty results.
 * Used to simulate the presence of a cache layer.
 */
export class NoCacheClient implements ICacheClient {
    /** Does nothing */
    close = async () => {
        return;
    };

    /** Does nothing */
    events = async () => {
        return;
    };

    /** Does nothing */
    get = async (): Promise<null> => {
        return null;
    };

    /** Does nothing but returns the expectend number of null values */
    mget = async (keys: Array<string>): Promise<Array<null>> => {
        return keys.map(() => null);
    };

    /** Does nothing */
    set = async () => {
        return;
    };

    /** Does nothing */
    mset = async () => {
        return;
    };

    /** Does nothing */
    del = async () => {
        return;
    };

    /** Does nothing */
    mdel = async () => {
        return;
    };
}
