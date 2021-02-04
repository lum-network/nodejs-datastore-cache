import { Datastore } from '@google-cloud/datastore';

import { DataClient, NoCacheClient, RedisCacheClient } from '../src';

describe('DataClient configuration', () => {
    describe('Without cache', () => {
        let clt: DataClient;

        afterAll(() => {
            if (clt) {
                expect(clt.close).not.toThrow(Error);
            }
        });

        it('accept default configuration with no cache layer', () => {
            clt = new DataClient();
            expect(clt.datastoreClient).toBeInstanceOf(Datastore);
            expect(clt.cacheClient).toBeInstanceOf(NoCacheClient);
            expect(clt.close).not.toThrow(Error);
        });
    });

    describe('Without redis cache', () => {
        let clt: DataClient;

        afterAll(() => {
            if (clt) {
                expect(clt.close).not.toThrow(Error);
            }
        });

        it('accept default configuration with redis cache layer', async () => {
            clt = new DataClient({}, new RedisCacheClient());
            expect(clt.datastoreClient).toBeInstanceOf(Datastore);
            expect(clt.cacheClient).toBeInstanceOf(RedisCacheClient);
            // Single calls simple tests
            await expect(clt.cacheClient.set('foo', 'bar')).resolves.toEqual(undefined);
            await expect(clt.cacheClient.get('foo')).resolves.toEqual('bar');
            await expect(clt.cacheClient.del('foo')).resolves.toEqual(undefined);
            await expect(clt.cacheClient.get('foo')).resolves.toEqual(null);
            // Multi calls simple tests
            await expect(clt.cacheClient.mset({ 'foo': 'bar' })).resolves.toEqual(undefined);
            await expect(clt.cacheClient.mget(['foo'])).resolves.toEqual(['bar']);
            await expect(clt.cacheClient.mdel(['foo'])).resolves.toEqual(undefined);
            await expect(clt.cacheClient.mget(['foo'])).resolves.toEqual([null]);
        });
    });
});
