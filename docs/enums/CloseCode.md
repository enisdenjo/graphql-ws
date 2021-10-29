[graphql-ws](../README.md) / CloseCode

# Enumeration: CloseCode

`graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

## Table of contents

### Enumeration members

- [BadRequest](CloseCode.md#badrequest)
- [BadResponse](CloseCode.md#badresponse)
- [ConnectionAcknowledgementTimeout](CloseCode.md#connectionacknowledgementtimeout)
- [ConnectionInitialisationTimeout](CloseCode.md#connectioninitialisationtimeout)
- [Forbidden](CloseCode.md#forbidden)
- [InternalClientError](CloseCode.md#internalclienterror)
- [InternalServerError](CloseCode.md#internalservererror)
- [SubprotocolNotAcceptable](CloseCode.md#subprotocolnotacceptable)
- [SubscriberAlreadyExists](CloseCode.md#subscriberalreadyexists)
- [TooManyInitialisationRequests](CloseCode.md#toomanyinitialisationrequests)
- [Unauthorized](CloseCode.md#unauthorized)

## Enumeration members

### BadRequest

• **BadRequest** = `4400`

___

### BadResponse

• **BadResponse** = `4004`

___

### ConnectionAcknowledgementTimeout

• **ConnectionAcknowledgementTimeout** = `4504`

___

### ConnectionInitialisationTimeout

• **ConnectionInitialisationTimeout** = `4408`

___

### Forbidden

• **Forbidden** = `4403`

___

### InternalClientError

• **InternalClientError** = `4005`

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
