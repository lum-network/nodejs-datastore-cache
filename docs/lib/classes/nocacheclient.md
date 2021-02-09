# Class: NoCacheClient

Always returns empty results.
Used to simulate the presence of a cache layer.

## Hierarchy

* **NoCacheClient**

## Implements

* *ICacheClient*

## Table of contents

### Constructors

- [constructor](nocacheclient.md#constructor)

### Methods

- [close](nocacheclient.md#close)
- [del](nocacheclient.md#del)
- [events](nocacheclient.md#events)
- [get](nocacheclient.md#get)
- [mdel](nocacheclient.md#mdel)
- [mget](nocacheclient.md#mget)
- [mset](nocacheclient.md#mset)
- [set](nocacheclient.md#set)

## Constructors

### constructor

\+ **new NoCacheClient**(): [*NoCacheClient*](nocacheclient.md)

**Returns:** [*NoCacheClient*](nocacheclient.md)

## Methods

### close

▸ **close**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>

___

### del

▸ **del**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>

___

### events

▸ **events**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>

___

### get

▸ **get**(): *Promise*<*null*\>

Does nothing

**Returns:** *Promise*<*null*\>

___

### mdel

▸ **mdel**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>

___

### mget

▸ **mget**(`keys`: *string*[]): *Promise*<*null*[]\>

Does nothing but returns the expectend number of null values

#### Parameters:

Name | Type |
------ | ------ |
`keys` | *string*[] |

**Returns:** *Promise*<*null*[]\>

___

### mset

▸ **mset**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>

___

### set

▸ **set**(): *Promise*<*void*\>

Does nothing

**Returns:** *Promise*<*void*\>
