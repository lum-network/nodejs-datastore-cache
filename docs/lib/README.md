# @lum-network/nodejs-datastore-cache

## Table of contents

### Namespaces

- [DataUtils](modules/datautils.md)

### Classes

- [DataClient](classes/dataclient.md)
- [Entity](classes/entity.md)
- [GeoPt](classes/geopt.md)
- [Key](classes/key.md)
- [NoCacheClient](classes/nocacheclient.md)
- [RedisCacheClient](classes/rediscacheclient.md)

### Functions

- [Persist](README.md#persist)
- [PersistKey](README.md#persistkey)
- [PersistStruct](README.md#persiststruct)

## Functions

### Persist

▸ `Const`**Persist**(`options?`: ExposeOptions & DatastoreOptions): PropertyDecorator

Decorator to declare a field must be saved into the datastore upon save calls.

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`options` | ExposeOptions & DatastoreOptions | ... |     |

**Returns:** PropertyDecorator

___

### PersistKey

▸ `Const`**PersistKey**(`options?`: ExposeOptions): PropertyDecorator

Decorator used to persist a datastore key
Using another decorator to persist key will result in unpredictable behaviour

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`options` | ExposeOptions | ... |     |

**Returns:** PropertyDecorator

___

### PersistStruct

▸ `Const`**PersistStruct**(`typeFunction?`: (`type?`: TypeHelpOptions) => Function, `options?`: ExposeOptions & DatastoreOptions): PropertyDecorator

Decorator to declare a field must be saved into the datastore upon save calls.
The type function is necessary to properly recover the underlying data type upon deserialization.

#### Parameters:

Name | Type | Default value | Description |
------ | ------ | ------ | ------ |
`typeFunction?` | (`type?`: TypeHelpOptions) => Function | - |  |
`options` | ExposeOptions & DatastoreOptions | ... |     |

**Returns:** PropertyDecorator
