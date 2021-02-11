import { Key, Entity, Persist, PersistKey, PersistStruct, DataClient } from '../src';

describe('Docs example', () => {
    it('should work and provide a basic integration example', async () => {
        // MyInnerEntity model
        class MyInnerEntity extends Entity {
            @Persist()
            my_inner_number?: number;

            constructor(props?: Partial<MyInnerEntity>) {
                super(props && props.key);
                Object.assign(this, props);
            }
        }

        // MyEntity model
        class MyEntity extends Entity {
            @PersistKey()
            my_persisted_foreign_key?: Key;

            @PersistStruct(() => MyInnerEntity)
            my_persisted_inner_data?: MyInnerEntity;

            @Persist()
            my_persisted_string?: string;

            _my_private_string?: string;

            constructor(props?: Partial<MyEntity>) {
                super(props && props.key);
                Object.assign(this, props);
            }
        }

        // Create new entity instance
        const key = Key.nameKey('MyEntity', 'my-entity-id-01');
        const e = new MyEntity({
            key: key,
            my_persisted_foreign_key: Key.nameKey('MyForeignEntity', 'some-foreign-id'),
            my_persisted_string: 'bonjour',
            my_persisted_inner_data: new MyInnerEntity({ my_inner_number: 42 }),
        });

        // Create a data client (you can specify the cache layer to use when creating the client)
        const clt = new DataClient();

        // Persist the entity
        await clt.save(e);

        // Get the persisted entity
        const persisted = await clt.get(key, MyEntity);

        // Update persisted entity
        e.my_persisted_string = 'hello';
        await clt.save(e);
        const persistedUpdated = await clt.get(key, MyEntity);

        // Delete the persisted entity
        await clt.delete(key);

        // Tests
        expect(persisted).not.toBe(null);
        if (persisted) {
            expect(persisted.my_persisted_string).toEqual('bonjour');
        }

        expect(persistedUpdated).not.toBe(null);
        if (persistedUpdated) {
            expect(persistedUpdated.my_persisted_string).toEqual('hello');
        }
    });
});
