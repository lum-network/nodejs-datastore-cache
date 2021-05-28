# Documentation

The code should be documented enough to make this library easy to use for anyone familiar with Google Cloud datastore.

You can find more details by browsing the [code documentation](./lib).

## Disclaimer

This library basically provides a clean wrapper around the @google-cloud/datastore library and works around the various shady implementations provided by the said library.

Therefore, using the @google-cloud/datastore directly, in parallel to this library, is highly discouraged as it can lead to undesired behaviours.

## Important nodes

### Serializing entities & keys

The serialization is made using the [class-transformer](https://github.com/typestack/class-transformer) library.

Due to the google datastore library implementation, serializing using the generic `classToPlain` and `Entity.toPlain` method does not output the same result (for more information you can look into the `Key.encode` method and see that it requires a datastore instance which is not possible to provide using `classToPlain`).

This is actually not much of an issue but something developers need to be aware of, as it can lead to unpredictable behaviour if not handled properly. Both serializations are compatible when de-serializing anyway.

The example below outline this difference. In most use cases you will not run in this situation but if at some point you want to serialize your entity and you cannot use the `toPlain` method or simply do not have access to a datastore client instance you will have this difference in serialization.

```typescript
@Exclude()
class MyEntity extends Entity {
    @Persist()
    text?: string;

    @PersistKey()
    child_key?: Key;

    constructor(props?: Partial<MyEntity>) {
        super(props && props.key);
        Object.assign(this, props);
    }
}

const e = new MyEntity({ key: Key.nameKey('MyEntity', 'parent-id'), text: 'hello', child_key: Key.nameKey('ChildKind', 'child-id') });

const toPlain = e.toPlain(clt.datastoreClient));
console.log(toPlain);
// Will output
// {
//     key: 'agNkZXZyFwsSCE15RW50aXR5IglwYXJlbnQtaWQM',
//     text: 'hello',
//     child_key: 'agNkZXZyFwsSCUNoaWxkS2luZCIIY2hpbGQtaWQM'
// }

const nativePlain = classToPlain(e);
console.log(nativePlain);
// Will output
// {
//     key: {
//         kind: 'MyEntity',
//         id: undefined,
//         name: 'parent-id',
//         namespace: undefined,
//         parent: undefined,
//         path: [ 'MyEntity', 'parent-id' ]
//     },
//     text: 'hello',
//     child_key: {
//         kind: 'ChildKind',
//         id: undefined,
//         name: 'child-id',
//         namespace: undefined,
//         parent: undefined,
//         path: [ 'ChildKind', 'child-id' ]
//     }
// }

const deserialized = [
    plainToClass(MyEntity, toPlain),
    plainToClass(MyEntity, nativePlain),
    Entity.fromPlain(toPlain, MyEntity),
    Entity.fromPlain(nativePlain, MyEntity),
];

console.log(deserialized);
// all deserialized values are "equal"
```

The `Entity.toPlain` method is used internally to serialize entities and save them into the cache layer. This way serialized entities should be compatible with other serialization provided by GCloud libraries in other languages (Python or Golang for example).

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

Failing to enforce a global @Exclude() for each an Entity will not trigger any particular issue until you try to serialize the Entity using `classToPlain` directly.
So better do it all the time just to be sure.

```typescript
// MyInnerEntity model
@Exclude()
class MyInnerEntity extends Entity {
    @Persist()
    my_inner_number?: number;

    constructor(props?: Partial<MyInnerEntity>) {
        super(props && props.key);
        Object.assign(this, props);
    }
}

// MyEntity model
@Exclude()
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
