import { DataClient, RedisCacheClient } from '../src';

describe('DataClient features', () => {
    describe('Without cache layer', () => {
        let clt: DataClient;
        beforeAll(() => {
            clt = new DataClient();
        });

        afterAll(async () => {
            await expect(clt.close()).resolves.toEqual(undefined);
        });
    });

    describe('With redis cache layer', () => {
        let clt: DataClient;
        beforeAll(() => {
            clt = new DataClient({}, new RedisCacheClient());
        });

        afterAll(async () => {
            await expect(clt.close()).resolves.toEqual(undefined);
        });

        it('should be able to get multiple keys', async () => {
            // await clt.datastoreClient.save({ key: clt.datastoreClient.key(['MyEntity', 'tata']), data: { 'name': 'tata' } });
            // await expect(clt.getMulti([new datastore.Key({ path: ['MyEntity', 'toto'] })])).resolves.toEqual([null]);
        });
    });
});
