import { Exclude } from 'class-transformer';
import { DataClient, Entity, Key, Persist, PersistStruct, RedisCacheClient } from '../src';

@Exclude()
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
        beforeAll(async () => {
            clt = new DataClient();
            await clt.connect();
        });

        afterAll(async () => {
            await expect(clt.disconnect()).resolves.toEqual(undefined);
        });
    });

    describe('With redis cache layer', () => {
        let clt: DataClient;
        beforeAll(async () => {
            clt = new DataClient({}, new RedisCacheClient());
            await clt.connect();
        });

        afterAll(async () => {
            await expect(clt.disconnect()).resolves.toEqual(undefined);
        });

        it('should allocate unique keys', async () => {
            const keys1 = await clt.allocateIds('MyEntity', 50);
            const keys2 = await clt.allocateIds('MyEntity', 100);
            const keys3 = await clt.allocateIds('MyEntity', 150);
            const allKeys = keys1.concat(keys2).concat(keys3);
            for (let k = 0; k < allKeys.length; k++) {
                const key = allKeys[k];
                expect(key.id).toBeGreaterThan(0);
                expect(allKeys.filter((v) => v.id === key.id)).toHaveLength(1);
            }
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

        it('should init keys if incomplete when saving within a transaction', async () => {
            const e1Key = Key.incompleteKey('MyEntity1');
            const e2Key = Key.incompleteKey('MyEntity2');
            const e3Key = Key.incompleteKey('MyEntity3');
            const e4Key = Key.idKey('MyEntity4', Math.floor(Math.random() * 1000000));
            const e4Id = e4Key.id;
            const e5Key = Key.nameKey('MyEntity5', Math.floor(Math.random() * 1000000).toString());
            const e5Name = e5Key.name;

            await clt.runInTransaction(async (txClt: DataClient) => {
                await txClt.save(new MyEntity({ key: e1Key }));
                await txClt.save(new MyEntity({ key: e2Key }));
                await txClt.save(new MyEntity({ key: e5Key }));
                await txClt.saveMulti([new MyEntity({ key: e5Key }), new MyEntity({ key: e3Key }), new MyEntity({ key: e4Key })]);
            });
            expect(e1Key.id).toBeGreaterThan(0);
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
            expect(await e1Stored.toPlain(clt.datastoreClient)).toEqual(await e1.toPlain(clt.datastoreClient));

            // Entity should be persisted in cache
            let e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).not.toBe(null);
            let e1Cached = MyEntity.fromPlain(JSON.parse(e1Str as string), MyEntity);
            expect(await e1Cached.toPlain(clt.datastoreClient)).toEqual(await e1.toPlain(clt.datastoreClient));

            // Cache should be set upon each get
            await clt.cacheClient.del(await clt.cacheKeyFromDatastoreKey(e1Key));
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).toBe(null);
            e1Stored = await clt.get(e1Key, MyEntity);
            expect(await e1Stored.toPlain(clt.datastoreClient)).toEqual(await e1.toPlain(clt.datastoreClient));
            e1Str = await clt.cacheClient.get(await clt.cacheKeyFromDatastoreKey(e1Key));
            expect(e1Str).not.toBe(null);
            e1Cached = MyEntity.fromPlain(JSON.parse(e1Str as string), MyEntity);
            expect(await e1Cached.toPlain(clt.datastoreClient)).toEqual(await e1.toPlain(clt.datastoreClient));

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
            expect(await e1Stored.toPlain(clt.datastoreClient)).toEqual(await e1.toPlain(clt.datastoreClient));

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
            expect(JSON.stringify(await entities[1].toPlain(clt.datastoreClient))).toEqual(JSON.stringify(await e1.toPlain(clt.datastoreClient)));
            expect(entities[2]).toBeNull();
            expect(JSON.stringify(await entities[3].toPlain(clt.datastoreClient))).toEqual(JSON.stringify(await e2.toPlain(clt.datastoreClient)));
            expect(entities[4]).toBeNull();
            expect(JSON.stringify(await entities[5].toPlain(clt.datastoreClient))).toEqual(JSON.stringify(await e3.toPlain(clt.datastoreClient)));
            expect(entities[6]).toBeNull();

            // Getting empty key array should work
            entities = await clt.getMulti([], MyEntity);
            expect(entities.length).toEqual(0);
            // Setting empty entities array should work
            await clt.saveMulti([]);
            // Get multi with one cached entity should work
            entities = await clt.getMulti([keys[1]], MyEntity);
            expect(entities.length).toEqual(1);

            // Entities should be available from cache
            let cached = await clt.cacheClient.mget(await clt.cacheKeysFromDatastoreKeys(keys));
            expect(cached.length).toEqual(7);
            expect(cached[0]).toBeNull();
            expect(JSON.parse(cached[1] as string)).toEqual(await e1.toPlain(clt.datastoreClient));
            expect(cached[2]).toBeNull();
            expect(JSON.parse(cached[3] as string)).toEqual(await e2.toPlain(clt.datastoreClient));
            expect(cached[4]).toBeNull();
            expect(JSON.parse(cached[5] as string)).toEqual(await e3.toPlain(clt.datastoreClient));
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

        it('should allow noindex properties', async () => {
            const tooLongToIndexStr = Buffer.alloc(1501, '.').toString();

            @Exclude()
            class MyNoIndexStruct extends Entity {
                @Persist({ noindex: true })
                text?: string;

                @Persist({ noindex: true })
                arr?: string[];

                constructor(props?: Partial<MyNoIndexStruct>) {
                    super(props && props.key);
                    Object.assign(this, props);
                }
            }

            @Exclude()
            class MyNoIndexEntity extends Entity {
                @PersistStruct(() => MyNoIndexStruct)
                inner?: MyNoIndexStruct;

                @PersistStruct(() => MyNoIndexStruct)
                inners?: MyNoIndexStruct[];

                @Persist({ noindex: true })
                text?: string;

                @Persist({ noindex: true })
                arr?: string[];

                constructor(props?: Partial<MyNoIndexEntity>) {
                    super(props && props.key);
                    Object.assign(this, props);
                }
            }

            // Save an entity with plenty of props noindex initialized
            let e = new MyNoIndexEntity({
                key: Key.incompleteKey('MyNoIndexEntity'),
                inner: new MyNoIndexStruct({
                    text: tooLongToIndexStr,
                    arr: [tooLongToIndexStr, tooLongToIndexStr],
                }),
                inners: [
                    new MyNoIndexStruct({
                        text: tooLongToIndexStr,
                        arr: [tooLongToIndexStr, tooLongToIndexStr],
                    }),
                ],
                text: tooLongToIndexStr,
                arr: [tooLongToIndexStr, tooLongToIndexStr],
            });

            await clt.save(e);
            expect(e.key.id).toBeGreaterThan(0);
            e.key = Key.incompleteKey('MyNoIndexEntity');
            await clt.runInTransaction(async (txClt) => {
                await txClt.save(e);
            });
            expect(e.key.id).toBeGreaterThan(0);

            // Save an entity with many missing props which should not cause any issue
            e = new MyNoIndexEntity({
                key: Key.incompleteKey('MyNoIndexEntity'),
                inner: new MyNoIndexStruct({
                    arr: [tooLongToIndexStr, tooLongToIndexStr],
                }),
                inners: [
                    new MyNoIndexStruct({
                        text: tooLongToIndexStr,
                    }),
                ],
                text: tooLongToIndexStr,
            });

            await clt.save(e);
            expect(e.key.id).toBeGreaterThan(0);
            e.key = Key.incompleteKey('MyNoIndexEntity');
            await clt.runInTransaction(async (txClt) => {
                await txClt.save(e);
            });
            expect(e.key.id).toBeGreaterThan(0);
        });

        it('should force type', async () => {
            @Exclude()
            class MyTypeEntity extends Entity {
                @Persist({ type: 'float' })
                float: number;

                @Persist()
                dateWithoutDecorator: string | Date;

                @Persist({ type: 'date' })
                dateWithDecorator: string | Date;

                constructor(props?: Partial<MyTypeEntity>) {
                    super(props && props.key);
                    Object.assign(this, props);
                }
            }

            const e = new MyTypeEntity({
                key: Key.incompleteKey('MyTypeEntity'),
                float: 42.0,
                dateWithoutDecorator: new Date().toString(),
                dateWithDecorator: new Date().toString(),
            });

            await clt.save(e);

            expect(e.key.id).toBeGreaterThan(0);

            const result = await clt.get(e.key, MyTypeEntity);

            expect(result.float).toEqual(42.0);
            expect(result.dateWithoutDecorator instanceof Date).toBeFalsy();
            expect(result.dateWithDecorator instanceof Date).toBeTruthy();
            expect(result.dateWithDecorator).toEqual(new Date(e.dateWithDecorator));
        });
    });
});
