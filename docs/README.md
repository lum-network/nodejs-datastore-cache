# Documentation

## Node version

The library is developped and tested using **NodeJS v12 Erbium**.

[Library code documentation](./lib)

```typescript
import { Entity, Persist, PersistKey, PersistStruct } from '@surprise/nodejs-datastore-cache';

// MyInnerEntity model
class MyInnerEntity extends Entity {
    @Persist()
    my_inner_number: number;

    constructor(props?: Partial<MyInnerEntity>) {
        super(props && props.key);
        Object.assign(this, props);
    }
}

// MyEntity model
class MyEntity extends Entity {
    @PersistKey()
    my_persisted_foreign_key: Key;

    @PersistStruct(() => MyInnerEntity)
    my_persisted_inner_data: MyInnerEntity;

    @Persist()
    my_persisted_string: string;

    _my_private_string: string;

    constructor(props?: Partial<MyEntity>) {
        super(props && props.key);
        Object.assign(this, props);
    }
}

// Create new entity instance
const e = new MyEntity({
    key: Key.nameKey('MyEntity', 'my-entity-id-01'),
    my_persisted_foreign_key: Key.nameKey('MyForeignEntity', 'some-foreign-id'),
    my_persisted_string: 'bonjour',
    my_persisted_inner_data: new MyInnerEntity({ my_inner_number: 42 }),
});
```
