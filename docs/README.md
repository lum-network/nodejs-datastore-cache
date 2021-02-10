# Documentation

The code should be documented enough to make this library easy to use for anyone familiar with Google Cloud datastore.

You can find more details by browsing the [code documentation](./lib).

## Examples

A couple examples to help you get started.

### DataClient

Everything goes by the DataClient which is intented to be a singleton for an application.

The client basically wraps the calls to the datastore and/or the cache layer.

```typescript
// Create a basic data client
new DataClient();

// Create a data client with a redis cache layer
new DataClient({}, new RedisCacheClient());
```

### Entity Models

Each persisted property must either use one of the following decorators:

-   @PersistKey: For properties of type Key
-   @PersistStruct: For nested entities / class such as GeoPt
-   @Persist: For native types

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

-   **Key.nameKey** to create a key with a string ID
-   **Key.idKey** to create a key with an integer ID
-   **Key.incompleteKey** to create a key and let the datastore provide a unique integer ID upon save

```typescript
// Create new entity instance
const key = Key.nameKey('MyEntity', 'my-entity-id-01');
const e = new MyEntity({
    key: key,
    my_persisted_foreign_key: Key.nameKey('MyForeignEntity', 'some-foreign-id'),
    my_persisted_string: 'bonjour',
    my_persisted_inner_data: new MyInnerEntity({ my_inner_number: 42 }),
});

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

### Queries

#### Keys only queries (recommended)

Using this method is highly recommended:

-   Keys only queries are fast
-   Can easily be followed by a client.getMulti in order to leverage cache capabilities

```typescript
const clt = new DataClient();

const qry = clt.createQuery('MyEntity').filter('type', 'some-type').order('created_at', { descending: true });

const [keys, nextCursor, more] = await clt.runKeysOnlyQuery(qry, 10);
// keys: [k1, k2]
// nextCursor: can be used to get next page results
// more: true if more results are available

const entities = await clt.getMulti(keys, MyEntity);
// Will return the entities either from cache or datastore

if (more && nextCursor) {
    const [p1Keys, p1NextCursor, p1More] = await clt.runKeysOnlyQuery(qry, 10, nextCursor);
    // Will return the next page results
}
```

#### Entities queries (not recommended)

Using this method is not recommended:

-   This does not use any cache capability in order to maintain consistency
-   Using this method is not recommended as it does not beneficiate from the cache layer
-   Better use runKeysOnlyQuery followed by getMulti

```typescript
const clt = new DataClient();

const qry = clt.createQuery('MyEntity').filter('type', 'some-type').order('created_at', { descending: true });

const [entities, nextCursor, more] = await clt.runQuery(MyEntity, qry, 10);
// entities: [e1, e2]
// nextCursor: can be used to get next page results
// more: true if more results are available
```

### Transactions

Transactions can either be done manually in case of very specific needs or done through the provided wrapper.

#### Easy way

```typescript
const clt = new DataClient();

const key = Key.nameKey('MyEntity', 'my-unique-id');

const e = new MyEntity({
    key: key,
    my_persisted_string: 'my-unique-content',
});

// Run the provided function into a transaction context
const resp = await clt.runInTransaction(async (tx) => {
    // Check if the entity exist (this will bypass the cache due to the transaction context)
    const existingEntity = await tx.get(e.key);
    // Only persist the entity if it does not exists
    if (!existingEntity) {
        await tx.save(e);
    }
    // Using clt methods directly here will result in making datastore and/or cache calls outside the transaction context
    // This can be handy to run queries not related to the current transaction without causing contention or having to worry about transaction limitations

    // Returning an Error will automatically rollback the transaction and raise the same error
    return;
});
// resp: the datastore commit response
```

#### Complex way

```typescript
const clt = new DataClient();
// Create a transaction manually
const tx = clt.newTransactionClient();
// Start the transaction
await tx.run();

// Do something using the tx client

// Commit or rollback the transaction
await tx.commit();
await tx.rollback();
```
