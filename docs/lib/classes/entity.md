# Class: Entity

Entity abstract wrapper for datastore entities.

This abstract class is intented to be inherited by each model aiming to be saved at some point into the datastore.

Important notes:
- @Persist | @PersistKey | @PersistStruct must be specified on all properties that need to be persisted into datastore and cache
- A property starting with an underscore `_` will be considered private and will not be persisted

## Hierarchy

* **Entity**

## Table of contents

### Constructors

- [constructor](entity.md#constructor)

### Properties

- [\_beforeSaveHook](entity.md#_beforesavehook)
- [key](entity.md#key)

### Methods

- [getIndexesExclusions](entity.md#getindexesexclusions)
- [toDatastore](entity.md#todatastore)
- [toDatastoreObject](entity.md#todatastoreobject)
- [toPlain](entity.md#toplain)
- [fromDatastore](entity.md#fromdatastore)
- [fromPlain](entity.md#fromplain)

## Constructors

### constructor

\+ **new Entity**(`key?`: [*Key*](key.md)): [*Entity*](entity.md)

Create a new Entity with an optional key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key?` | [*Key*](key.md) | the entity key    |

**Returns:** [*Entity*](entity.md)

## Properties

### \_beforeSaveHook

• `Optional` **\_beforeSaveHook**: *undefined* \| () => *Promise*<*void*\>

___

### key

• `Optional` **key**: *undefined* \| [*Key*](key.md)

## Methods

### getIndexesExclusions

▸ **getIndexesExclusions**(): *string*[]

Gets the indexes exclusions from the decorators metadata
Such as @Persist({ noindex: true })

Notes:
- This basically output something like ['text', 'arr[]', 'inner.text', 'inner.arr[]'] depending on the props
- The output is not deterministic and will depend on the current instance. This is not an issue but good to know I guess.

**Returns:** *string*[]

___

### toDatastore

▸ **toDatastore**(): DatastoreEntity

Converts entity properties into datastore properties
This method should rarely be used by outside code.

**Returns:** DatastoreEntity

___

### toDatastoreObject

▸ **toDatastoreObject**(`nested`: *boolean*): *object*

Converts entity properties into datastore properties
This method should rarely be used by outside code.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`nested` | *boolean* | whether or not the entity is the root entity or a nested one    |

**Returns:** *object*

___

### toPlain

▸ **toPlain**(`store`: *Datastore*, `keyLocationPrefix?`: *string*): *Promise*<{ [Key: string]: *unknown*;  }\>

Converts the entity into a plain javascript object that can safely be serialized into JSON or other string based
representations.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`store` | *Datastore* | a datastore client instance   |
`keyLocationPrefix?` | *string* | optional key location prefix used by Key.encode method    |

**Returns:** *Promise*<{ [Key: string]: *unknown*;  }\>

___

### fromDatastore

▸ `Static`**fromDatastore**<T\>(`dsEntity`: *any*, `cls`: *ClassConstructor*<T\>): T

Converts a datastore entity into an Entity inheriting model

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*Entity*](entity.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`dsEntity` | *any* | a datastore entity, either from a previous Entity.toDatastore call or retrieve from a datastore call   |
`cls` | *ClassConstructor*<T\> | the class to convert the datastore entity into   |

**Returns:** T

___

### fromPlain

▸ `Static`**fromPlain**<T\>(`plainEntity`: *object*, `cls`: *ClassConstructor*<T\>): T

Converts a plain object eventually created by the Entity.toPlain method into an Entity instance.

#### Type parameters:

Name | Type |
------ | ------ |
`T` | [*Entity*](entity.md)<T\> |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`plainEntity` | *object* | a plain object that was eventually created by the Entity.toPlain method   |
`cls` | *ClassConstructor*<T\> | the class to convert the plain object into    |

**Returns:** T
