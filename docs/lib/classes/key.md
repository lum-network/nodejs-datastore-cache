# Class: Key

Wrapper class to build datastore Keys

```typescript
// Create a new key using its id (integer) or name (string)
const k1 = Key.nameKey('MyEntity', 'my-unique-name');
const k2 = Key.idKey('MyEntity', 1);

// Create an incomplete key (the id will be provided when saving the entity) with a namespace and parent
const k3 = Key.incompleteKey(
  'MyEntity',
  'pvt-namespace',
   Key.nameKey('MyParentEntity', 'my-unique-parent-name', 'pvt-namespace'),
)
```

## Hierarchy

* **Key**

## Table of contents

### Constructors

- [constructor](key.md#constructor)

### Methods

- [encode](key.md#encode)
- [toDatastore](key.md#todatastore)
- [toPlain](key.md#toplain)
- [decode](key.md#decode)
- [fromDatastore](key.md#fromdatastore)
- [fromPlain](key.md#fromplain)
- [idKey](key.md#idkey)
- [incompleteKey](key.md#incompletekey)
- [nameKey](key.md#namekey)

## Constructors

### constructor

\+ **new Key**(`kind`: *string*, `id?`: *number*, `name?`: *string*, `namespace?`: *string*, `parent?`: [*Key*](key.md)): [*Key*](key.md)

Create a new entity according to the provided params

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kind` | *string* | Entity kind   |
`id?` | *number* | Entity integer ID   |
`name?` | *string* | Entity string Name   |
`namespace?` | *string* | Entity namespace   |
`parent?` | [*Key*](key.md) | Entity parent    |

**Returns:** [*Key*](key.md)

## Methods

### encode

▸ **encode**(`store`: *Datastore*, `locationPrefix?`: *string*): *Promise*<*string*\>

Encode the Key instance into an urlsafe string
This feature is cross-compatible with other datastore sdk languages such as Python only if you use the same
datastore and key configuration.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`store` | *Datastore* | A datastore instance   |
`locationPrefix?` | *string* | An optional location prefix    |

**Returns:** *Promise*<*string*\>

___

### toDatastore

▸ **toDatastore**(): *Key*

Converts the current Key instance into a datastore key instance usable for direct datastore calls
such as save.

**Returns:** *Key*

___

### toPlain

▸ **toPlain**(): *object*

Converts the Key instance into a plain object

**Returns:** *object*

___

### decode

▸ `Static`**decode**(`encodedKey`: *string*): [*Key*](key.md)

Create a new Key instance based on an encoded key
This feature is cross-compatible with other datastore sdk languages such as Python only if you use the same
datastore and key configuration.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`encodedKey` | *string* | The previously encoded key    |

**Returns:** [*Key*](key.md)

___

### fromDatastore

▸ `Static`**fromDatastore**(`key`: *Key*): [*Key*](key.md)

Create a new Key instance based on the provided datastore key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`key` | *Key* | key from the datastore module    |

**Returns:** [*Key*](key.md)

___

### fromPlain

▸ `Static`**fromPlain**(`plain`: *string* \| { [key: string]: *any*;  }): [*Key*](key.md)

Create a Key instance from a plain javascript object or an encoded string key

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`plain` | *string* \| { [key: string]: *any*;  } | a plain object or a string encoded key    |

**Returns:** [*Key*](key.md)

___

### idKey

▸ `Static`**idKey**(`kind`: *string*, `id`: *number*, `namespace?`: *string*, `parent?`: [*Key*](key.md)): [*Key*](key.md)

Create a new key by ID (integer)

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kind` | *string* | Entity kind   |
`id` | *number* | Entity ID   |
`namespace?` | *string* | Entity namespace   |
`parent?` | [*Key*](key.md) | Entity parent    |

**Returns:** [*Key*](key.md)

___

### incompleteKey

▸ `Static`**incompleteKey**(`kind`: *string*, `namespace?`: *string*, `parent?`: [*Key*](key.md)): [*Key*](key.md)

Create an incomplete key. The key ID will be set once saved into the datastore
Warning: The DataClient will save the new ID into the Key instance automatically, if you use another client you must do it manually.

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kind` | *string* | Entity kind   |
`namespace?` | *string* | Entity namespace   |
`parent?` | [*Key*](key.md) | Entity parent    |

**Returns:** [*Key*](key.md)

___

### nameKey

▸ `Static`**nameKey**(`kind`: *string*, `name`: *string*, `namespace?`: *string*, `parent?`: [*Key*](key.md)): [*Key*](key.md)

Create a new key by name (string) ID

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`kind` | *string* | Entity kind   |
`name` | *string* | Entity name   |
`namespace?` | *string* | Entity namespace   |
`parent?` | [*Key*](key.md) | Entity parent    |

**Returns:** [*Key*](key.md)
