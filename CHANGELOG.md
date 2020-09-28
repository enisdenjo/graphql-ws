# [1.6.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.5.0...v1.6.0) (2020-09-28)


### Features

* **client:** Support providing custom WebSocket implementations ([#18](https://github.com/enisdenjo/graphql-transport-ws/issues/18)) ([1515fe2](https://github.com/enisdenjo/graphql-transport-ws/commit/1515fe2adcc0bb2b18a1309550f4e41528985f54))

# [1.5.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.4.2...v1.5.0) (2020-09-18)


### Bug Fixes

* **server:** Use `subscribe` from the config ([6fbd47c](https://github.com/enisdenjo/graphql-transport-ws/commit/6fbd47c2ef14a6ae4297ffe0aaa689eeb3741ed0))


### Features

* **server:** Define execution/subscription `context` in creation options ([5b3d253](https://github.com/enisdenjo/graphql-transport-ws/commit/5b3d25351cdd2714a1edb9833ab2c2c7a9316944)), closes [#13](https://github.com/enisdenjo/graphql-transport-ws/issues/13)

## [1.4.2](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.4.1...v1.4.2) (2020-09-16)


### Bug Fixes

* **server:** Receiving more than one `ConnectionInit` message closes the socket immediately ([757c6e9](https://github.com/enisdenjo/graphql-transport-ws/commit/757c6e966ffa1756cca2687b0275d7d7eff2ce87))

## [1.4.1](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.4.0...v1.4.1) (2020-09-11)


### Performance Improvements

* **client:** Memoize message parsing for each subscriber ([2a7ba46](https://github.com/enisdenjo/graphql-transport-ws/commit/2a7ba4642c0ea1a3294b8b3ea3440957ec7fcb7b))

# [1.4.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.3.0...v1.4.0) (2020-09-10)


### Bug Fixes

* **client:** Only `query` is required in the subscribe payload ([e892530](https://github.com/enisdenjo/graphql-transport-ws/commit/e892530b37108a210976e416b2f5eb3004be7ad3))


### Features

* **server:** Pass roots for operation fields as an option ([dcb5ed4](https://github.com/enisdenjo/graphql-transport-ws/commit/dcb5ed4dcc3c4569b104b2cbe9979161fad2ff0a))

# [1.3.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.2.0...v1.3.0) (2020-09-10)


### Features

* WebSocket Ping and Pong as keep-alive ([#11](https://github.com/enisdenjo/graphql-transport-ws/issues/11)) ([16ae316](https://github.com/enisdenjo/graphql-transport-ws/commit/16ae316b35a90d45f379336ec3ed5bedf3f2e28e))
* **client:** Emit events for `connecting`, `connected` and `closed` ([627775b](https://github.com/enisdenjo/graphql-transport-ws/commit/627775b8e1aca8f359607020ff2c3bcc37b50787))
* **client:** Implement silent-reconnects ([c6f7872](https://github.com/enisdenjo/graphql-transport-ws/commit/c6f7872126300befcc47e8e46e82342c2924f453)), closes [#7](https://github.com/enisdenjo/graphql-transport-ws/issues/7)
* **client:** Lazy option can be changed ([fb0ec14](https://github.com/enisdenjo/graphql-transport-ws/commit/fb0ec1478e5219eb75e6bf2a1c2fd2a3a9cbb90d))

# [1.2.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.1.1...v1.2.0) (2020-09-04)


### Features

* Package rename `@enisdenjo/graphql-transport-ws` 👉 `graphql-transport-ws`. ([494f676](https://github.com/enisdenjo/graphql-transport-ws/commit/494f6766279325769e81f52ce7b4b442c85f9476))

## [1.1.1](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.1.0...v1.1.1) (2020-08-28)


### Bug Fixes

* add the sink to the subscribed map AFTER emitting a subscribe message ([814f46c](https://github.com/enisdenjo/graphql-transport-ws/commit/814f46c119792aaa240d0fcdb318dccdd1cc0e87))
* notify only relevant sinks about errors or completions ([62155ba](https://github.com/enisdenjo/graphql-transport-ws/commit/62155ba0b79516141633b86765921b2401fcc2ed))

# [1.1.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.0.2...v1.1.0) (2020-08-28)


### Bug Fixes

* **server:** allow skipping init message wait with zero values ([a7419df](https://github.com/enisdenjo/graphql-transport-ws/commit/a7419df077acb018418016c7a06716fb3c054ddb))
* **server:** use subscription specific formatter for queries and mutations too ([5672a04](https://github.com/enisdenjo/graphql-transport-ws/commit/5672a045332ea835e6ff7ce862c7c2a46729363b))


### Features

* **client:** introduce Socky 🧦 - the nifty internal socket state manager ([#8](https://github.com/enisdenjo/graphql-transport-ws/issues/8)) ([a4bee6f](https://github.com/enisdenjo/graphql-transport-ws/commit/a4bee6fb8c1bd56637363a76f6ab0c3b64f55931))

## [1.0.2](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.0.1...v1.0.2) (2020-08-26)


### Bug Fixes

* correctly detect WebSocket server ([eab29dc](https://github.com/enisdenjo/graphql-transport-ws/commit/eab29dcae3d031a117de37dee09770833e9573cf))

## [1.0.1](https://github.com/enisdenjo/graphql-transport-ws/compare/v1.0.0...v1.0.1) (2020-08-26)


### Bug Fixes

* reset connected/connecting state when disconnecting and disposing ([2eb3cd5](https://github.com/enisdenjo/graphql-transport-ws/commit/2eb3cd5965cf34f6d6b21748daea520163b9c789))
* **client:** cant read the `CloseEvent.reason` after bundling so just pass the whole event to the sink error and let the user handle it ([9ccb46b](https://github.com/enisdenjo/graphql-transport-ws/commit/9ccb46bc80024cb2de823702d2bd308052c6c516))
* **client:** send complete message and close only if socket is still open ([49b75ce](https://github.com/enisdenjo/graphql-transport-ws/commit/49b75cec60fec9c8a42119b124a9c54d29d30308))
* http and ws have no default exports ([5c01ed9](https://github.com/enisdenjo/graphql-transport-ws/commit/5c01ed924793ce17f036d26d9d5d63cd5cecc6aa))
* include `types` file holding important types ([f3e4edf](https://github.com/enisdenjo/graphql-transport-ws/commit/f3e4edf96e5c6cecf025811e2beb7ecc324ea962))
* **server:** scoped execution result formatter from `onConnect` ([f91fadb](https://github.com/enisdenjo/graphql-transport-ws/commit/f91fadb6464a6e74f9a11555026dd5f9279df563))
* export both the client and the server from index ([29923b1](https://github.com/enisdenjo/graphql-transport-ws/commit/29923b1e35a462c5b5a19d64603d59f25c1c5987))
* **server:** store the intial request in the context ([6927ee0](https://github.com/enisdenjo/graphql-transport-ws/commit/6927ee01c0b8224f8290322a964e70382614d0e8))

# [1.0.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v0.0.2...v1.0.0) (2020-08-17)


### Features

* **client:** Re-implement following the new transport protocol ([#6](https://github.com/enisdenjo/graphql-transport-ws/issues/6)) ([5191a35](https://github.com/enisdenjo/graphql-transport-ws/commit/5191a358098c6f9a661ae90e0420fa430db9152c))
* **server:** Implement following the new transport protocol ([#1](https://github.com/enisdenjo/graphql-transport-ws/issues/1)) ([a412d25](https://github.com/enisdenjo/graphql-transport-ws/commit/a412d2570e484046a058c11f39813c7794ec9147))
* Rewrite GraphQL over WebSocket Protocol ([#2](https://github.com/enisdenjo/graphql-transport-ws/issues/2)) ([42045c5](https://github.com/enisdenjo/graphql-transport-ws/commit/42045c577de9d95a81a37d850b38f4482914cebd))


### BREAKING CHANGES

* This lib is no longer compatible with [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws). It follows a [redesigned transport protocol](https://github.com/enisdenjo/graphql-transport-ws/blob/2b8c3f095d382d299e9e1670eb907b37591626ca/PROTOCOL.md) aiming to improve security, stability and reduce ambiguity.
