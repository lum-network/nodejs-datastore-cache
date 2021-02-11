# NodeJS Datastore Cache library

**Opinionated NodeJS library for simplified google cloud datastore and cache layer interactions.**

*The implementation should be similar to the official datastore client go version, because this is the only implementation that actually make sense and can be consistent across languages and frameworks.*

## Introduction

**The library provides a DataClient abstraction to access datastore and/or cached data:**
- Data get calls will set the cache
- Data set calls will delete the cache
- Data delete calls will delete the cache

**The library can use cache (but does not have to):**
- By default no cache client will be used
- Redis client is provided by the library
- Other cache clients can be implemented easily (see redis cache client code for example)

## Dependencies

Core dependencies include:
- Datastore client: https://github.com/googleapis/nodejs-datastore
- Redis client: https://github.com/NodeRedis/node-redis
- Class transform: https://github.com/typestack/class-transformer  

## Node version

The library is tested using **NodeJS 10.x, 12.x, 14.x, 15.x**.

## Installation

```bash
yarn add @surprise/nodejs-datastore-cache
```

## Documentation

The [Library documentation](./docs) should contain everything you need to get started.

## Development & Testing

The library requires a Google Cloud datastore and a running redis server to run the unittests.

A docker compose file is provided to simplify this process but those services can eventually be remote or launched "manually".

### Datastore emulator & Redis server

```bash
docker-compose up
```

### Run the unittests

```bash
yarn test
```

## License

Apache Version 2.0

See [LICENSE](./LICENSE)
