[graphql-ws](../README.md) / [common](../modules/common.md) / CloseCode

# Enumeration: CloseCode

[common](../modules/common.md).CloseCode

`graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

## Table of contents

### Enumeration members

- [BadRequest](common.CloseCode.md#badrequest)
- [ConnectionAcknowledgementTimeout](common.CloseCode.md#connectionacknowledgementtimeout)
- [ConnectionInitialisationTimeout](common.CloseCode.md#connectioninitialisationtimeout)
- [Forbidden](common.CloseCode.md#forbidden)
- [InternalServerError](common.CloseCode.md#internalservererror)
- [SubprotocolNotAcceptable](common.CloseCode.md#subprotocolnotacceptable)
- [SubscriberAlreadyExists](common.CloseCode.md#subscriberalreadyexists)
- [TooManyInitialisationRequests](common.CloseCode.md#toomanyinitialisationrequests)
- [Unauthorized](common.CloseCode.md#unauthorized)

## Enumeration members

### BadRequest

• **BadRequest** = `4400`

___

### ConnectionAcknowledgementTimeout

• **ConnectionAcknowledgementTimeout** = `4418`

___

### ConnectionInitialisationTimeout

• **ConnectionInitialisationTimeout** = `4408`

___

### Forbidden

• **Forbidden** = `4403`

___

### InternalServerError

• **InternalServerError** = `4500`

___

### SubprotocolNotAcceptable

• **SubprotocolNotAcceptable** = `4406`

___

### SubscriberAlreadyExists

• **SubscriberAlreadyExists** = `4409`

Subscriber distinction is very important

___

### TooManyInitialisationRequests

• **TooManyInitialisationRequests** = `4429`

___

### Unauthorized

• **Unauthorized** = `4401`

Tried subscribing before connect ack
