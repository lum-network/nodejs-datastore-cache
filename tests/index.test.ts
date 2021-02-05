import { Datastore } from '@google-cloud/datastore';

import { DataClient, NoCacheClient, RedisCacheClient } from '../src';

describe('DataClient configuration', () => {
    describe('Without cache layer', () => {
        it('accept default configuration with no cache layer', async () => {
            const clt = new DataClient();
            expect(clt.datastoreClient).toBeInstanceOf(Datastore);
            expect(clt.cacheClient).toBeInstanceOf(NoCacheClient);
            await expect(clt.close()).resolves.toEqual(undefined);
        });
    });

    describe('With redis cache layer', () => {
        it('accept default configuration with redis cache layer', async () => {
            const clt = new DataClient({}, new RedisCacheClient());
            expect(clt.datastoreClient).toBeInstanceOf(Datastore);
            expect(clt.cacheClient).toBeInstanceOf(RedisCacheClient);
            await expect(clt.close()).resolves.toEqual(undefined);
        });
    });
});
