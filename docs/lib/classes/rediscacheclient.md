# Class: RedisCacheClient

Redis cache layer implementation using https://github.com/NodeRedis/node-redis

## Hierarchy

* **RedisCacheClient**

## Implements

* *ICacheClient*

## Table of contents

### Constructors

- [constructor](rediscacheclient.md#constructor)

### Properties

- [client](rediscacheclient.md#client)
- [eventsCallback](rediscacheclient.md#eventscallback)

### Methods

- [close](rediscacheclient.md#close)
- [del](rediscacheclient.md#del)
- [events](rediscacheclient.md#events)
- [get](rediscacheclient.md#get)
- [mdel](rediscacheclient.md#mdel)
- [mget](rediscacheclient.md#mget)
- [mset](rediscacheclient.md#mset)
- [set](rediscacheclient.md#set)

## Constructors

### constructor

\+ **new RedisCacheClient**(`options?`: ClientOpts, `eventsCallback?`: (`event`: CacheClientEvent) => *void*): [*RedisCacheClient*](rediscacheclient.md)

Creates the underlying redis client by forwarding it the specified client options
An events callback can also be specified here or later by calling the events method (see method details for more information)

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`options?` | ClientOpts | redis client options   |
`eventsCallback?` | (`event`: CacheClientEvent) => *void* | events callback    |

**Returns:** [*RedisCacheClient*](rediscacheclient.md)

## Properties

### client

• **client**: *RedisClient*

___

### eventsCallback

• **eventsCallback**: (`event`: CacheClientEvent) => *void*

## Methods

### close

▸ **close**(): *Promise*<*void*\>

Terminates the client connection to the redis server

**Returns:** *Promise*<*void*\>

___

### del

▸ **del**(`key`: *string*): *Promise*<*void*\>

Deletes the value stored in redis at the specified key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | *string* | a redis key    |

**Returns:** *Promise*<*void*\>

___

### events

▸ **events**(`callback`: (`event`: CacheClientEvent) => *void*): *Promise*<*void*\>

Register an events callback (same as mentionned in the constructor)
Only one callback is supported at a time. Multiple subsequent calls will simply override the callback.

The callback will eventually receive all the events specified by the CacheClientEvent enum.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`callback` | (`event`: CacheClientEvent) => *void* | events callback    |

**Returns:** *Promise*<*void*\>

___

### get

▸ **get**(`key`: *string*): *Promise*<ICacheString\>

Get data by key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | *string* | a redis key    |

**Returns:** *Promise*<ICacheString\>

___

### mdel

▸ **mdel**(`keys`: *string*[]): *Promise*<*void*\>

Deletes the value stored in redis at the specified keys

#### Parameters:

Name | Type |
------ | ------ |
`keys` | *string*[] |

**Returns:** *Promise*<*void*\>

___

### mget

▸ **mget**(`keys`: *string*[]): *Promise*<ICacheStringArray\>

Get data by keys

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`keys` | *string*[] | an array of redis keys    |

**Returns:** *Promise*<ICacheStringArray\>

___

### mset

▸ **mset**(`kvs`: ICacheStringMap): *Promise*<*void*\>

Set multiple keys associated data

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kvs` | ICacheStringMap | a map of key value to store in redis    |

**Returns:** *Promise*<*void*\>

___

### set

▸ **set**(`key`: *string*, `value`: *string*, `expiresInSec?`: *number*): *Promise*<*void*\>

Set data by key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | *string* | a redis key   |
`value` | *string* | the value to store in redis   |
`expiresInSec?` | *number* | the optional expiration time for the key in seconds (must be > 0 to be taken into account)    |

**Returns:** *Promise*<*void*\>
