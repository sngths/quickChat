/* import { Buffer } from 'buffer'
import { RSocketConnector } from 'rsocket-core'
import { WebsocketClientTransport } from 'rsocket-websocket-client'
import type { Payload, RSocket } from 'rsocket-core'

let rsocket: RSocket
// const Buffer = require('buffer/').Buffer

export async function initRSocket() {
  const connector = new RSocketConnector({
    setup: {
      payload: {
        data: Buffer.from('hello'),
      },
      dataMimeType: 'application/json',
      metadataMimeType: 'message/x.rsocket.routing.v0',
      keepAlive: 1000000, // avoid sending during test
      lifetime: 100000,
    },
    transport: new WebsocketClientTransport({
      url: 'ws://localhost:8081',
      wsCreator: url => new WebSocket(url) as any,
    }),
  })
  rsocket = await connector.connect()
  return rsocket
}

export async function requestFireAndForget(prompt: string) {
  rsocket.fireAndForget({
    data: Buffer.from(`prompt:${prompt}`),
  }, {
    onError: (e) => {
      console.error(e)
    },
    onComplete() {
      // eslint-disable-next-line no-console
      console.log('complete')
    },
  })
}

export async function requestResponse(prompt: string): Promise<Payload | null> {
  return new Promise((resolve, reject) =>
    rsocket.requestResponse(
      { data: Buffer.from(`prompt:${prompt}`) },
      {
        onError: e => reject(e),
        onNext: (payload, isComplete) => {
          // eslint-disable-next-line no-console
          console.log(`payload[data: ${payload.data}, metadata: ${payload.metadata}]|${isComplete}`)
          resolve(payload)
        },
        onComplete: () => {
          resolve(null)
        },
        onExtension: () => {},
      },
    ),
  )
}

export async function requestStream(prompt: string): Promise<Payload | null> {
  return new Promise((resolve, reject) =>
    rsocket.requestStream(
      {
        data: Buffer.from(prompt),
      },
      1,
      {
        onError: e => reject(e),
        onNext: (payload, isComplete) => {
          // eslint-disable-next-line no-console
          console.log(`payload[data: ${payload.data}, metadata: ${payload.metadata}]|${isComplete}`)
          resolve(payload)
        },
        onComplete: () => {
          resolve(null)
        },
        onExtension: () => {},
      },
    ),
  )
} */

import { RSocketClient } from 'rsocket-core'
import {
  BufferEncoders,
  MESSAGE_RSOCKET_AUTHENTICATION,
  MESSAGE_RSOCKET_COMPOSITE_METADATA,
  MESSAGE_RSOCKET_ROUTING,
  RSocketClient,
  TEXT_PLAIN,
  encodeCompositeMetadata,
  encodeRoute,
  encodeSimpleAuthMetadata,
} from 'rsocket-core'
import type { ReactiveSocket, Payload, ISubscriber, ISubscription, DuplexConnection, Frame, ConnectionStatus } from 'rsocket-types';
import { Flowable, Signle } from 'rsocket-flowable';
import RSocketWebSocketClient from 'rsocket-websocket-client'

const maxRSocketRequestN = 2147483647
const keepAlive = 60000
const lifetime = 180000
const dataMimeType = 'application/octet-stream'
const metadataMimeType = MESSAGE_RSOCKET_COMPOSITE_METADATA.string
const route = 'rsocket.request.stream'

const clientFactory: () => RSocketClient<Buffer, Buffer> = () => new RSocketClient({
	setup: {
		dataMimeType,
		keepAlive,
		lifetime,
		metadataMimeType,
		payload: {
			data: undefined,
			metadata: encodeCompositeMetadata([
				[TEXT_PLAIN, Buffer.from('Hello World')],
				[MESSAGE_RSOCKET_ROUTING, encodeRoute(route)],
				[
					MESSAGE_RSOCKET_AUTHENTICATION,
					encodeSimpleAuthMetadata('user', 'pass'),
				],
				['custom/test/metadata', Buffer.from([1, 2, 3])],
			]),
		},
	},
	transport: new RSocketWebSocketClient(
		{
			debug: true,
			url: 'ws://localhost:8080/rsocket',
			wsCreator: url => new WebSocket(url),
		},
		BufferEncoders,
	),
});


const socket = new ReconnectableRSocket(clientFactory);


const request = new Flowable(subscriber => {
	socket
		.requestStream({
			data: Buffer.from('request-stream'),
			metadata: encodeCompositeMetadata([
				[TEXT_PLAIN, Buffer.from('Hello World')],
				[MESSAGE_RSOCKET_ROUTING, encodeRoute(route)],
				[
					MESSAGE_RSOCKET_AUTHENTICATION,
					encodeSimpleAuthMetadata('user', 'pass'),
				],
				['custom/test/metadata', Buffer.from([1, 2, 3])],
			]),
		})
		.subscribe(subscriber);
});

request
	.map()
	.lift(actual => new ResubscribeOperator(request, actual))
	.subscribe({
		// eslint-disable-next-line no-console
		onComplete: () => console.log('Request-stream completed'),
		onError: error =>
			console.error(`Request-stream error:${error.message}`),
		// eslint-disable-next-line no-console
		onNext: value => console.log('%s %s', value.data, value.metadata),
		onSubscribe: sub => sub.request(maxRSocketRequestN),
	});

setTimeout(() => { }, 30000000);
