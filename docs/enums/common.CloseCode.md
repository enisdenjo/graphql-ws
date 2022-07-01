[graphql-ws](../README.md) / [common](../modules/common.md) / CloseCode

# Enumeration: CloseCode

[common](../modules/common.md).CloseCode

`graphql-ws` expected and standard close codes of the [GraphQL over WebSocket Protocol](/PROTOCOL.md).

## Table of contents

### Enumeration Members

- [BadRequest](common.CloseCode.md#badrequest)
- [BadResponse](common.CloseCode.md#badresponse)
- [ConnectionAcknowledgementTimeout](common.CloseCode.md#connectionacknowledgementtimeout)
- [ConnectionInitialisationTimeout](common.CloseCode.md#connectioninitialisationtimeout)
- [Forbidden](common.CloseCode.md#forbidden)
- [InternalClientError](common.CloseCode.md#internalclienterror)
- [InternalServerError](common.CloseCode.md#internalservererror)
- [SubprotocolNotAcceptable](common.CloseCode.md#subprotocolnotacceptable)
- [SubscriberAlreadyExists](common.CloseCode.md#subscriberalreadyexists)
- [TooManyInitialisationRequests](common.CloseCode.md#toomanyinitialisationrequests)
- [Unauthorized](common.CloseCode.md#unauthorized)

## Enumeration Members

### BadRequest

• **BadRequest** = ``4400``

___

### BadResponse

• **BadResponse** = ``4004``

___

### ConnectionAcknowledgementTimeout

• **ConnectionAcknowledgementTimeout** = ``4504``

___

### ConnectionInitialisationTimeout

• **ConnectionInitialisationTimeout** = ``4408``

___

### Forbidden

• **Forbidden** = ``4403``

___

### InternalClientError

• **InternalClientError** = ``4005``

___

### InternalServerError

• **InternalServerError** = ``4500``

___

### SubprotocolNotAcceptable

• **SubprotocolNotAcceptable** = ``4406``

___

### SubscriberAlreadyExists

• **SubscriberAlreadyExists** = ``4409``

Subscriber distinction is very important

___

### TooManyInitialisationRequests

• **TooManyInitialisationRequests** = ``4429``

___

### Unauthorized

• **Unauthorized** = ``4401``

Tried subscribing before connect ack
