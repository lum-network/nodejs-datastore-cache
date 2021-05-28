# Namespace: DataUtils

## Table of contents

### Functions

- [getKeyValue](datautils.md#getkeyvalue)
- [propToDatastore](datautils.md#proptodatastore)
- [propToPlain](datautils.md#proptoplain)
- [sortJSON](datautils.md#sortjson)

## Functions

### getKeyValue

▸ `Const`**getKeyValue**<T, K\>(`o`: T, `propertyName`: K): T[K]

Clean method to access plain object property

#### Type parameters:

Name | Type |
------ | ------ |
`T` | - |
`K` | *string* \| *number* \| *symbol* |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`o` | T | the object   |
`propertyName` | K | the prop name    |

**Returns:** T[K]

___

### propToDatastore

▸ `Const`**propToDatastore**(`elem`: *unknown*): *any*

Recursively converts object properties into datastore elements that can later be used by
datastore client calls such as save.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`elem` | *unknown* | either a native type or one of this module types (Entity, Key, GeoPt)   |

**Returns:** *any*

___

### propToPlain

▸ `Const`**propToPlain**(`elem`: *unknown*, `store`: *Datastore*, `keyLocationPrefix?`: *string*): *Promise*<*any*\>

Recursively converts object properties into plain objects that can be safely serialized into JSON or other
string based representation.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`elem` | *unknown* | either a native type or one of this module types (Entity, Key, GeoPt)   |
`store` | *Datastore* | a datastore client instance   |
`keyLocationPrefix?` | *string* | optional key location prefix used by Key.encode method    |

**Returns:** *Promise*<*any*\>

___

### sortJSON

▸ `Const`**sortJSON**<T\>(`jsonObj`: T): T

Sorts an object properties recursively.

#### Type parameters:

Name |
------ |
`T` |

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`jsonObj` | T | object to sort   |

**Returns:** T

a new object with keys sorted alphabetically
