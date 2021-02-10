# Documentation

The code should be documented enough to make this library easy to use for anyone familiar with Google Cloud datastore.

You can find more details by browsing the [code documentation](./lib).

------

## Examples

A couple examples to help you get started.

### Entity Models

Each persisted property must either use one of the following decorators:
- @PersistKey: For properties of type Key
- @PersistStruct: For nested entities / class such as GeoPt
- @Persist: For native types

```typescript
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
```

### Entity CRUD

The Key class provides handlful datastore Key generation methods:
- **Key.nameKey** to create a key with a string ID
- **Key.idKey** to create a key with an integer ID
- **Key.incompleteKey** to create a key and let the datastore provide a unique integer ID upon save

```typescript
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
```
