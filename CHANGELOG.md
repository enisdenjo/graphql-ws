# [1.0.0](https://github.com/enisdenjo/graphql-transport-ws/compare/v0.0.2...v1.0.0) (2020-08-17)


### Features

* **client:** Re-implement following the new transport protocol ([#6](https://github.com/enisdenjo/graphql-transport-ws/issues/6)) ([5191a35](https://github.com/enisdenjo/graphql-transport-ws/commit/5191a358098c6f9a661ae90e0420fa430db9152c))
* **server:** Implement following the new transport protocol ([#1](https://github.com/enisdenjo/graphql-transport-ws/issues/1)) ([a412d25](https://github.com/enisdenjo/graphql-transport-ws/commit/a412d2570e484046a058c11f39813c7794ec9147))
* Rewrite GraphQL over WebSocket Protocol ([#2](https://github.com/enisdenjo/graphql-transport-ws/issues/2)) ([42045c5](https://github.com/enisdenjo/graphql-transport-ws/commit/42045c577de9d95a81a37d850b38f4482914cebd))


### BREAKING CHANGES

* This lib is no longer compatible with [`subscriptions-transport-ws`](https://github.com/apollographql/subscriptions-transport-ws). It follows a [redesigned transport protocol](https://github.com/enisdenjo/graphql-transport-ws/blob/2b8c3f095d382d299e9e1670eb907b37591626ca/PROTOCOL.md) aiming to improve security, stability and reduce ambiguity.
