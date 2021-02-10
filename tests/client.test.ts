import { DataClient, Entity, Key, Persist, RedisCacheClient } from '../src';

class MyEntity extends Entity {
    @Persist()
    content?: string;

    constructor(props?: Partial<MyEntity>) {
        super(props && props.key);
        Object.assign(this, props);
    }
}

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

        it('should init keys if incomplete when saving', async () => {
            const e1Key = Key.incompleteKey('MyEntity');
            const e2Key = Key.incompleteKey('MyEntity');
            const e3Key = Key.incompleteKey('MyEntity');
            const e4Key = Key.idKey('MyEntity', Math.floor(Math.random() * 1000000));
            const e5Key = Key.nameKey('MyEntity', Math.floor(Math.random() * 1000000).toString());
            const e4Id = e4Key.id;
            const e5Name = e5Key.name;

            await clt.save(new MyEntity({ key: e1Key }));
            expect(e1Key.id).toBeGreaterThan(0);
            const e1Id = e1Key.id;

            await clt.save(new MyEntity({ key: e4Key }));
            expect(e4Key.id).toEqual(e4Id);

            await clt.save(new MyEntity({ key: e5Key }));
            expect(e5Key.name).toEqual(e5Name);
            expect(e5Key.id).toBeUndefined();

            await clt.saveMulti([new MyEntity({ key: e1Key }), new MyEntity({ key: e2Key }), new MyEntity({ key: e3Key }), new MyEntity({ key: e4Key }), new MyEntity({ key: e5Key })]);
            expect(e1Key.id).toEqual(e1Id);
            expect(e2Key.id).toBeGreaterThan(0);
            expect(e3Key.id).toBeGreaterThan(0);
            expect(e4Key.id).toEqual(e4Id);
            expect(e5Key.name).toEqual(e5Name);
            expect(e5Key.id).toBeUndefined();
        });

        it('should be able to single get, set and delete', async () => {
            // Entity definition
            const e1Key = Key.incompleteKey('MyEntity');
            const e1 = new MyEntity({ key: e1Key, content: 'content-001' });

            // Key invalid
            expect(e1Key.id).toEqual(undefined);
            await expect(clt.get(e1Key, MyEntity)).rejects.toThrow(Error);

            // Save should update the key
            await clt.save(e1);
            expect(e1Key.id).toBeGreaterThan(0);

            // Entity should be persisted in datastore
            let e1Stored = await clt.get(e1Key, MyEntity);
            expect(JSON.stringify(e1Stored)).toEqual(JSON.stringify(e1));

            // Entity should be persisted in cache
            let e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).not.toBe(null);
            let e1Cached = MyEntity.fromPlain(JSON.parse(e1Str as string), MyEntity);
            expect(JSON.stringify(e1Cached)).toEqual(JSON.stringify(e1));

            // Cache should be set upon each get
            await clt.cacheClient.del(await clt.cacheKeyFromDatastoreKey(e1Key));
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).toBe(null);
            e1Stored = await clt.get(e1Key, MyEntity);
            expect(JSON.stringify(e1Stored)).toEqual(JSON.stringify(e1));
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).not.toBe(null);
            e1Cached = MyEntity.fromPlain(JSON.parse(e1Str as string), MyEntity);
            expect(JSON.stringify(e1Cached)).toEqual(JSON.stringify(e1));

            // Entity updates should be persisted
            const e1DsKey = e1.key?.toDatastore();
            e1.content = 'content-001-path-001';
            await clt.save(e1);
            expect(e1.key?.toDatastore()).toEqual(e1DsKey);

            // Cache should be cleared upon updates
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).toBe(null);

            // Getting the entity should return the updated result
            e1Stored = await clt.get(e1Key, MyEntity);
            expect(JSON.stringify(e1Stored)).toEqual(JSON.stringify(e1));

            // Deleting the entity should be persisted
            await clt.delete(e1Key);
            e1Stored = await clt.get(e1Key, MyEntity);
            expect(e1Stored).toBe(null);

            // Cache should be cleared upon deletes
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).toBe(null);
        });

        it('should be able to multi get, set and delete', async () => {
            const e1Key = Key.incompleteKey('MyEntity');
            const e2Key = Key.incompleteKey('MyEntity');
            const e3Key = Key.incompleteKey('MyEntity');
            const e1 = new MyEntity({ key: e1Key, content: 'e1' });
            const e2 = new MyEntity({ key: e2Key, content: 'e2' });
            const e3 = new MyEntity({ key: e3Key, content: 'e3' });

            await clt.saveMulti([e1, e2, e3]);
            expect(e1.key && e1.key.id).toBeGreaterThan(0);
            expect(e2.key && e2.key.id).toBeGreaterThan(0);
            expect(e3.key && e3.key.id).toBeGreaterThan(0);

            const keys = [
                Key.idKey('MyEntity', Math.floor(Math.random() * 1000000)),
                e1Key,
                Key.nameKey('MyEntity', Math.floor(Math.random() * 1000000).toString()),
                e2Key,
                Key.idKey('MyEntity', Math.floor(Math.random() * 1000000)),
                e3Key,
                Key.nameKey('MyUnknownKind', 'foo'),
            ];
            let entities = await clt.getMulti(keys, MyEntity);
            expect(entities.length).toEqual(7);
            expect(entities[0]).toBeNull();
            expect(JSON.stringify(entities[1])).toEqual(JSON.stringify(e1));
            expect(entities[2]).toBeNull();
            expect(JSON.stringify(entities[3])).toEqual(JSON.stringify(e2));
            expect(entities[4]).toBeNull();
            expect(JSON.stringify(entities[5])).toEqual(JSON.stringify(e3));
            expect(entities[6]).toBeNull();

            // Entities should be available from cache
            let cached = await clt.cacheClient.mget(await clt.cacheKeysFromDatastoreKeys(keys));
            expect(cached.length).toEqual(7);
            expect(cached[0]).toBeNull();
            expect(JSON.stringify(MyEntity.fromPlain(JSON.parse(cached[1] as string), MyEntity))).toEqual(JSON.stringify(e1));
            expect(cached[2]).toBeNull();
            expect(JSON.stringify(MyEntity.fromPlain(JSON.parse(cached[3] as string), MyEntity))).toEqual(JSON.stringify(e2));
            expect(cached[4]).toBeNull();
            expect(JSON.stringify(MyEntity.fromPlain(JSON.parse(cached[5] as string), MyEntity))).toEqual(JSON.stringify(e3));
            expect(cached[6]).toBeNull();

            // Delete entities should remove them from datastore and cache
            await clt.deleteMulti(keys);
            entities = await clt.getMulti(keys, MyEntity);
            expect(entities.length).toEqual(7);
            expect(entities).toEqual([null, null, null, null, null, null, null]);
            cached = await clt.cacheClient.mget(await clt.cacheKeysFromDatastoreKeys(keys));
            expect(cached.length).toEqual(7);
            expect(cached).toEqual([null, null, null, null, null, null, null]);
        });

        it('should be able to run transactions', async () => {
            const kind = 'MyEntity' + Math.ceil(Math.random() * 1000000).toString();

            // transaction should succeed and commit
            const e1Key = Key.nameKey(kind, 'id-001');
            const e1 = new MyEntity({
                key: e1Key,
                content: 'tx-entity-1',
            });
            const resp = await clt.runInTransaction(async (txClt) => {
                await txClt.save(e1);
            });
            expect(resp).not.toBeNull();

            // entity should be persisted in datastore
            let e = await clt.get(e1Key, MyEntity);
            expect(e?.content).toEqual('tx-entity-1');

            // transaction should fail and rollback
            e1.content = 'tx-entity-2';
            const future = clt.runInTransaction(async (txClt) => {
                await txClt.save(e1);
                return new Error('test error');
            });
            await expect(future).rejects.toThrow(new Error('test error'));

            // entity should have not been updated in datastore
            e = await clt.get(e1Key, MyEntity);
            expect(e?.content).toEqual('tx-entity-1');
        });

        it('should be able to run keys only queries', async () => {
            const kind = 'MyEntity' + Math.ceil(Math.random() * 1000000).toString();

            let originalEntities = ['a', 'b', 'c'].map((n) => new MyEntity({ key: Key.nameKey(kind, n), content: n }));
            await clt.saveMulti(originalEntities);
            let [keys, nextCursor, more] = await clt.runKeysOnlyQuery(clt.createQuery(kind));
            expect(keys.length).toEqual(3);
            expect(more).toBeFalsy();
            expect(JSON.stringify(keys)).toEqual(JSON.stringify(originalEntities.map((e) => e.key)));

            originalEntities = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((n) => new MyEntity({ key: Key.nameKey(kind, n), content: n }));
            await clt.saveMulti(originalEntities);
            // First page should contain 3 elements
            [keys, nextCursor, more] = await clt.runKeysOnlyQuery(clt.createQuery(kind), 3);
            expect(keys.length).toEqual(3);
            expect(more).toBeTruthy();
            expect(JSON.stringify(keys)).toEqual(JSON.stringify(originalEntities.slice(0, 3).map((e) => e.key)));
            // Second page should contain 3 elements
            [keys, nextCursor, more] = await clt.runKeysOnlyQuery(clt.createQuery(kind), 3, nextCursor);
            expect(keys.length).toEqual(3);
            expect(more).toBeTruthy();
            expect(JSON.stringify(keys)).toEqual(JSON.stringify(originalEntities.slice(3, 6).map((e) => e.key)));
            // Third page should contain 2 elements
            [keys, nextCursor, more] = await clt.runKeysOnlyQuery(clt.createQuery(kind), 3, nextCursor);
            expect(keys.length).toEqual(2);
            expect(more).toBeFalsy();
            expect(JSON.stringify(keys)).toEqual(JSON.stringify(originalEntities.slice(6, 8).map((e) => e.key)));
        });

        it('should be able to run queries', async () => {
            const kind = 'MyEntity' + Math.ceil(Math.random() * 1000000).toString();

            let originalEntities = ['d', 'e', 'f'].map((n) => new MyEntity({ key: Key.nameKey(kind, n), content: n }));
            await clt.saveMulti(originalEntities);
            let [entities, nextCursor, more] = await clt.runQuery(MyEntity, clt.createQuery(kind));
            expect(entities.length).toEqual(3);
            expect(more).toBeFalsy();
            expect(JSON.stringify(entities)).toEqual(JSON.stringify(originalEntities));

            originalEntities = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((n) => new MyEntity({ key: Key.nameKey(kind, n), content: n }));
            await clt.saveMulti(originalEntities);
            // First page should contain 3 elements
            [entities, nextCursor, more] = await clt.runQuery(MyEntity, clt.createQuery(kind), 3);
            expect(entities.length).toEqual(3);
            expect(more).toBeTruthy();
            expect(JSON.stringify(entities)).toEqual(JSON.stringify(originalEntities.slice(0, 3)));
            // Second page should contain 3 elements
            [entities, nextCursor, more] = await clt.runQuery(MyEntity, clt.createQuery(kind), 3, nextCursor);
            expect(entities.length).toEqual(3);
            expect(more).toBeTruthy();
            expect(JSON.stringify(entities)).toEqual(JSON.stringify(originalEntities.slice(3, 6)));
            // Third page should contain 2 elements
            [entities, nextCursor, more] = await clt.runQuery(MyEntity, clt.createQuery(kind), 3, nextCursor);
            expect(entities.length).toEqual(2);
            expect(more).toBeFalsy();
            expect(JSON.stringify(entities)).toEqual(JSON.stringify(originalEntities.slice(6, 8)));
        });
    });
});
