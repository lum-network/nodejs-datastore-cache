import { ClientClosedError } from 'redis';

import { NoCacheClient, RedisCacheClient } from '../src';
import { ICacheClient } from '../src/cache';
import { CacheClientEvent } from '../src/cache/interfaces';

describe('Cache Layer', () => {
    describe('NoCacheClient functional', () => {
        let clt: ICacheClient;
        beforeAll(async () => {
            clt = new NoCacheClient();
            await clt.connect();
        });

        afterAll(async () => {
            await expect(clt.disconnect()).resolves.toEqual(undefined);
        });

        it('returns empty results on every single call', async () => {
            // Cache single calls are functional
            await expect(clt.set('foo', 'bar')).resolves.toEqual(undefined);
            await expect(clt.get('foo')).resolves.toEqual(null);
            await expect(clt.del('foo')).resolves.toEqual(undefined);
            await expect(clt.get('foo')).resolves.toEqual(null);
            // Cache multi calls are functional
            await expect(clt.mset({ 'foo': 'bar' })).resolves.toEqual(undefined);
            await expect(clt.mget(['foo'])).resolves.toEqual([null]);
            await expect(clt.mdel(['foo'])).resolves.toEqual(undefined);
            await expect(clt.mget(['foo'])).resolves.toEqual([null]);
        });

        it('returns relevant number of results on multi calls', async () => {
            await expect(clt.mset({})).resolves.toEqual(undefined);
            await expect(clt.mset({ 'foo': 'bar' })).resolves.toEqual(undefined);
            await expect(clt.mget([])).resolves.toEqual([]);
            await expect(clt.mget(['foo'])).resolves.toEqual([null]);
            await expect(clt.mget(['foo', 'bar'])).resolves.toEqual([null, null]);
            await expect(clt.mget(['foobar', 'foo', 'bar'])).resolves.toEqual([null, null, null]);
        });
    });

    describe('RedisCacheClient functional', () => {
        let clt: ICacheClient;
        beforeAll(async () => {
            clt = new RedisCacheClient();
            await clt.connect();
        });

        afterAll(async () => {
            await expect(clt.disconnect()).resolves.toEqual(undefined);
        });

        it('returns proper results', async () => {
            // Single calls simple tests
            await expect(clt.set('foo', 'bar')).resolves.toEqual(undefined);
            await expect(clt.get('foo')).resolves.toEqual('bar');
            await expect(clt.del('foo')).resolves.toEqual(undefined);
            await expect(clt.get('foo')).resolves.toEqual(null);
            // Multi calls simple tests
            await expect(clt.mset({ 'foo': 'bar' })).resolves.toEqual(undefined);
            await expect(clt.mget(['foo', 'novalue'])).resolves.toEqual(['bar', null]);
            await expect(clt.mdel(['foo', 'novalue'])).resolves.toEqual(undefined);
            await expect(clt.mget(['foo'])).resolves.toEqual([null]);
        });

        it('returns relevant number of results on multi calls', async () => {
            await expect(clt.mset({})).resolves.toEqual(undefined);
            await expect(clt.mset({ 'foo': 'bar' })).resolves.toEqual(undefined);
            await expect(clt.mget([])).resolves.toEqual([]);
            await expect(clt.mget(['foo'])).resolves.toEqual(['bar']);
            await expect(clt.mget(['foo', 'bar'])).resolves.toEqual(['bar', null]);
            await expect(clt.mget(['foobar', 'foo', 'bar'])).resolves.toEqual([null, 'bar', null]);
        });

        it('can set keys to expire', async () => {
            await expect(clt.set('expire-foo-bar', 'oh no!', 1)).resolves.toEqual(undefined);
            await expect(clt.get('expire-foo-bar')).resolves.toEqual('oh no!');
            await (() =>
                new Promise((resolve) => {
                    setTimeout(resolve, 1100);
                }))();
            await expect(clt.get('expire-foo-bar')).resolves.toEqual(null);
        });
    });

    describe('RedisCacheClient error handling', () => {
        it('returns error if connection closed', async () => {
            const clt = new RedisCacheClient();
            await expect(clt.get('foo')).rejects.toThrow(ClientClosedError);
        });

        it('emit connection events', async (done) => {
            expect.assertions(2);
            const clt = new RedisCacheClient({}, async (ev: CacheClientEvent) => {
                expect([CacheClientEvent.Connected, CacheClientEvent.Ready, CacheClientEvent.Closed]).toContain(ev);
                if (ev === CacheClientEvent.Ready) {
                    clt.disconnect();
                    done();
                }
            });
            await clt.connect();
        });
    });
});
