# Class: DataClient

DataClient for interacting with the underlying datastore and cache layer
This class basically wraps datastore calls from https://github.com/googleapis/nodejs-datastore and the specified
cache client calls.

A DataClient instance should be used as a singleton and considered thread safe.

```typescript
// Default datastore uses a no cache policy and the default datastore credentials such as the one available in the environment
const cltNoCache = new DataClient();

// The main provided cache client is redis
const cltRedisCache = new DataClient({}, new RedisCacheClient());
```

## Hierarchy

* **DataClient**

## Table of contents

### Constructors

- [constructor](dataclient.md#constructor)

### Properties

- [cacheClient](dataclient.md#cacheclient)
- [datastoreClient](dataclient.md#datastoreclient)
- [transaction](dataclient.md#transaction)

### Methods

- [\_req](dataclient.md#_req)
- [cacheKeyFromDatastoreKey](dataclient.md#cachekeyfromdatastorekey)
- [cacheKeysFromDatastoreKeys](dataclient.md#cachekeysfromdatastorekeys)
- [close](dataclient.md#close)
- [createQuery](dataclient.md#createquery)
- [delete](dataclient.md#delete)
- [deleteMulti](dataclient.md#deletemulti)
- [get](dataclient.md#get)
- [getMulti](dataclient.md#getmulti)
- [newTransactionClient](dataclient.md#newtransactionclient)
- [runInTransaction](dataclient.md#runintransaction)
- [runKeysOnlyQuery](dataclient.md#runkeysonlyquery)
- [runQuery](dataclient.md#runquery)
- [save](dataclient.md#save)
- [saveMulti](dataclient.md#savemulti)

## Constructors

### constructor

\+ **new DataClient**(`datastoreOptions?`: DatastoreOptions, `cacheClient?`: ICacheClient, `cloneClient?`: [*DataClient*](dataclient.md)): [*DataClient*](dataclient.md)

Creates the underlying datastore instance by forwarding it the specified client options

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`datastoreOptions?` | DatastoreOptions | datastore client options   |
`cacheClient?` | ICacheClient | cache client instance   |
`cloneClient?` | [*DataClient*](dataclient.md) | mostly used internally to clone the client during transactions    |

**Returns:** [*DataClient*](dataclient.md)

## Properties

### cacheClient

• **cacheClient**: ICacheClient

___

### datastoreClient

• **datastoreClient**: *Datastore*

___

### transaction

• `Optional` **transaction**: *undefined* \| *Transaction*

## Methods

### \_req

▸ **_req**(): *DatastoreRequest*

Get the current request provider, either the ongoing transaction or the datastore client

**Returns:** *DatastoreRequest*

___

### cacheKeyFromDatastoreKey

▸ **cacheKeyFromDatastoreKey**(`key`: [*Key*](key.md)): *Promise*<*string*\>

Encodes a key into a string key useable by the cache layer

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | [*Key*](key.md) | the key to encode    |

**Returns:** *Promise*<*string*\>

___

### cacheKeysFromDatastoreKeys

▸ **cacheKeysFromDatastoreKeys**(`keys`: [*Key*](key.md)[]): *Promise*<*string*[]\>

Encodes an array of keys into string keys useable by the cache layer

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`keys` | [*Key*](key.md)[] | the keys to encode    |

**Returns:** *Promise*<*string*[]\>

___

### close

▸ **close**(): *Promise*<*void*\>

Terminates the underlying datastore client as well as the cache client

**Returns:** *Promise*<*void*\>

___

### createQuery

▸ **createQuery**(`kind?`: *string*, `namespace?`: *string*): *Query*

Create a new query instance

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kind?` | *string* | datastore entity kind   |
`namespace?` | *string* | datastore namespace   |

**Returns:** *Query*

a new query instance

___

### delete

▸ **delete**(`key`: [*Key*](key.md)): *Promise*<*void*\>

Delete the entity associated with this key
Delete the cache data associated with this key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | [*Key*](key.md) | the entity key to delete    |

**Returns:** *Promise*<*void*\>

___

### deleteMulti

▸ **deleteMulti**(`keys`: [*Key*](key.md)[]): *Promise*<*void*\>

Delete the entities associated with those keys
Delete the cache data associated with those key

#### Parameters:

Name | Type |
------ | ------ |
`keys` | [*Key*](key.md)[] |

**Returns:** *Promise*<*void*\>

___

### get

▸ **get**<T\>(`key`: [*Key*](key.md), `cls`: *ClassConstructor*<T\>, `options?`: RunQueryOptions): *Promise*<*null* \| T\>

Get an entity by key
Set the cache data associated with the entity

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*Entity*](entity.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | [*Key*](key.md) | the key to get   |
`cls` | *ClassConstructor*<T\> | the class to transform the result into   |
`options?` | RunQueryOptions | datastore query options   |

**Returns:** *Promise*<*null* \| T\>

Either the entity or null if not found

___

### getMulti

▸ **getMulti**<T\>(`keys`: [*Key*](key.md)[], `cls`: *ClassConstructor*<T\>, `options?`: RunQueryOptions): *Promise*<(*null* \| T)[]\>

Get an array of entity by keys
Set the cache data associated with the entities

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*Entity*](entity.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`keys` | [*Key*](key.md)[] | the keys to get   |
`cls` | *ClassConstructor*<T\> | the class to transform the results into   |
`options?` | RunQueryOptions | datastore query options   |

**Returns:** *Promise*<(*null* \| T)[]\>

An array containing either the fetched entity or null for each requested key

___

### newTransactionClient

▸ **newTransactionClient**(`options?`: TransactionOptions): [*DataClient*](dataclient.md)

Create a clone of the client with an initialized transaction
The transacation calls to run and commit are not handled by this method

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options?` | TransactionOptions | optional transaction options   |

**Returns:** [*DataClient*](dataclient.md)

a clone of the current client with an initialized transaction

___

### runInTransaction

▸ **runInTransaction**(`fn`: (`tx`: [*DataClient*](dataclient.md)) => *Promise*<*void* \| Error\>, `options?`: TransactionOptions): *Promise*<CommitResponse\>

Run the provided function into a datastore transaction.
This method will create the transaction and commit it once fn() finishes

```typescript
// Create a basic client
const clt = new DataClient();

// Create an entity only if it does not exist in the datastore
this.runInTransaction((tx) => {
    const key = Key.nameKey('MyEntity', 'my-entity-id');
    const e = tx.get(key, MyEntity);
    if (!e) {
        tx.save(new MyEntity({ key }));
    }
});
```

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`fn` | (`tx`: [*DataClient*](dataclient.md)) => *Promise*<*void* \| Error\> | the function to execute within a transaction context   |
`options?` | TransactionOptions | optional transaction options    |

**Returns:** *Promise*<CommitResponse\>

___

### runKeysOnlyQuery

▸ **runKeysOnlyQuery**(`query`: *Query*, `maxResults?`: *number*, `startCursor?`: *string*, `options?`: RunQueryOptions): *Promise*<[[*Key*](key.md)[], *undefined* \| *string*, *boolean*]\>

Run a query and returns the fetched keys

Better use this method followed by a getMulti than use the runQuery in order to leverage cache capabilities

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`query` | *Query* | the query to run   |
`maxResults?` | *number* | optional maximum number of results   |
`startCursor?` | *string* | optional start cursor for paginated results   |
`options?` | RunQueryOptions | datastore query options   |

**Returns:** *Promise*<[[*Key*](key.md)[], *undefined* \| *string*, *boolean*]\>

an array of fetched keys, the next page cursor and whether or not more results might exist

___

### runQuery

▸ **runQuery**<T\>(`cls`: *ClassConstructor*<T\>, `query`: *Query*, `maxResults?`: *number*, `startCursor?`: *string*, `options?`: RunQueryOptions): *Promise*<[T[], *undefined* \| *string*, *boolean*]\>

Run a query and returns the fetched entities

This does not use any cache capability in order to maintain consistency
Using this method is not recommended as it does not beneficiate from the cache layer
Better use runKeysOnlyQuery followed by getMulti

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*Entity*](entity.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`cls` | *ClassConstructor*<T\> | the class to transform the results into   |
`query` | *Query* | the query to run   |
`maxResults?` | *number* | optional maximum number of results   |
`startCursor?` | *string* | optional start cursor for paginated results   |
`options?` | RunQueryOptions | datastore query options   |

**Returns:** *Promise*<[T[], *undefined* \| *string*, *boolean*]\>

an array of fetched entities, the next page cursor and whether or not more results might exist

___

### save

▸ **save**(`entity`: [*Entity*](entity.md)): *Promise*<*void*\>

Create or update an entity into the datastore
Delete the cache data associated with this entity

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`entity` | [*Entity*](entity.md) | the entity to save    |

**Returns:** *Promise*<*void*\>

___

### saveMulti

▸ **saveMulti**(`entities`: [*Entity*](entity.md)[]): *Promise*<*void*\>

Create or update the entities into the datastore
Delete the cache data associated with those entities

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`entities` | [*Entity*](entity.md)[] | the entities to save    |

**Returns:** *Promise*<*void*\>
