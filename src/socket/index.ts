import { RSocketConnector } from 'rsocket-core'
import { WebsocketClientTransport } from 'rsocket-websocket-client'
import type { Payload, RSocket } from 'rsocket-core'

let rsocket: RSocket

export async function initRSocket() {
  const connector = new RSocketConnector({
    setup: {
      payload: {
        data: Buffer.from('hello'),
      },
      dataMimeType: 'application/json',
      metadataMimeType: 'message/x.rsocket.routing.v0',
      keepAlive: 10000,
      lifetime: 100000,
    },
    transport: new WebsocketClientTransport({
      url: 'ws://localhost:8090',
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
        data: Buffer.from(`prompt:${prompt}`),
      },
      5000,
      {
        onError: e => reject(e),
        onNext: (payload, isComplete) => {
          // eslint-disable-next-line no-console
          console.log(`payload[data: ${payload.data}, metadata: ${payload.metadata}]|${isComplete}`)
        },
        onComplete: () => {
          resolve(null)
        },
        onExtension: () => {},
      },
    ),
  )
}
