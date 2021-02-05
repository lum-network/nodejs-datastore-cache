import { Datastore, DatastoreOptions } from '@google-cloud/datastore';

import { ICacheClient, NoCacheClient } from './cache';

export class DataClient {
    datastoreClient: Datastore;
    cacheClient: ICacheClient;

    constructor(datastoreOptions?: DatastoreOptions, cacheClient?: ICacheClient) {
        this.datastoreClient = new Datastore(datastoreOptions);
        this.cacheClient = cacheClient || new NoCacheClient();
    }

    close = async () => {
        await this.cacheClient.close();
    };
}
