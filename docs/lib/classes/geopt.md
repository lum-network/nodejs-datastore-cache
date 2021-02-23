# Class: GeoPt

Wrapper class to build datastore Geo Points based on latitude and longitude parameters

```typescript
// Create a GeoPt instance
const pt = new GeoPt(42.0, 2.0);
```

## Hierarchy

* **GeoPt**

## Table of contents

### Constructors

- [constructor](geopt.md#constructor)

### Properties

- [latitude](geopt.md#latitude)
- [longitude](geopt.md#longitude)

### Methods

- [toDatastore](geopt.md#todatastore)
- [toPlain](geopt.md#toplain)

## Constructors

### constructor

\+ **new GeoPt**(`latitude`: *number*, `longitude`: *number*): [*GeoPt*](geopt.md)

Create a new GeoPt instance from latitude and longitude

#### Parameters:

Name | Type | Description |
------ | ------ | ------ |
`latitude` | *number* | Geo point latitude   |
`longitude` | *number* | Geo point longitude    |

**Returns:** [*GeoPt*](geopt.md)

## Properties

### latitude

• **latitude**: *number*

___

### longitude

• **longitude**: *number*

## Methods

### toDatastore

▸ **toDatastore**(): *unknown*

Converts the current GeoPt instance into a datastore geopoint instance usable for direct datastore calls
such as save.

**Returns:** *unknown*

A datastore geopoint instance

___

### toPlain

▸ **toPlain**(): *object*

Converts the current GeoPt instance into a plain object with a latitude and a longitude.

**Returns:** *object*

Name | Type |
------ | ------ |
`latitude` | *number* |
`longitude` | *number* |

Plain object
