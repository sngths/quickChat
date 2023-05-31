import { RSocketConnector } from 'rsocket-core'
import { WebsocketClientTransport } from 'rsocket-websocket-client'
import type { Payload, RSocket } from 'rsocket-core'

let rsocket: RSocket

interface MessageListener {
  onMessage: (message: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}
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
      url: 'wss://proto.ringing.site',
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

export async function requestChatStream(prompt: string, listener: MessageListener) {
  rsocket.requestStream(
    {
      data: Buffer.from(`prompt:${prompt}`),
    },
    5000,
    {
      onError: e => listener.onError(e),
      onNext: (payload, isComplete) => {
        const msg = payload.data
        if (msg instanceof Buffer) {
          const msgStr = msg.toString('utf-8')
          if (msgStr.length > 0)
            listener.onMessage(msgStr)
        }
        // eslint-disable-next-line no-console
        console.log(`payload[data: ${payload.data}, metadata: ${payload.metadata}]|${isComplete}`)
      },
      onComplete: () => {
        listener.onComplete()
      },
      onExtension: () => {},
    },
  )
}

// 获取配置
export async function requestConfig1(): Promise<any> {
  return new Promise((resolve, reject) =>
    rsocket.requestResponse(
      { data: Buffer.from('config') },
      {
        onError: e => reject(e),
        onNext: (payload, isComplete) => {
          const msg = payload.data
          if (msg instanceof Buffer) {
            const msgStr = msg.toString('utf-8')
            if (msgStr.length > 0)
              resolve(JSON.parse(msgStr))
          }
        },
        onComplete: () => {
        },
        onExtension: () => {},
      },
    ),
  )
}

export async function requestConfig(onComplete: (data: any) => void) {
  await rsocket.requestResponse(
    { data: Buffer.from('config') },
    {
      onError: (e) => {
        console.error(e)
      },
      onNext: (payload, isComplete) => {
        const msg = payload.data
        if (msg instanceof Buffer) {
          const msgStr = msg.toString('utf-8')
          if (msgStr.length > 0)
            onComplete(JSON.parse(msgStr))
        }
      },
      onComplete: () => {
      },
      onExtension: () => {
      },
    },
  )
}

export async function requestSession() {
  let text = ''
  await rsocket.requestResponse(
    { data: Buffer.from('session') },
    {
      onError: (e) => {
        text = e.message
        console.error(e)
      },
      onNext: (payload, isComplete) => {
        const msg = payload.data
        if (msg instanceof Buffer) {
          const msgStr = msg.toString('utf-8')
          if (msgStr.length > 0)
            text = msgStr
        }
      },
      onComplete: () => {
      },
      onExtension: () => {
      },
    },
  )
  return JSON.parse(text)
}

export async function requestVerify() {
  let text = ''
  await rsocket.requestResponse(
    { data: Buffer.from('verify') },
    {
      onError: (e) => {
        text = e.message
        console.error(e)
      },
      onNext: (payload, isComplete) => {
        const msg = payload.data
        if (msg instanceof Buffer) {
          const msgStr = msg.toString('utf-8')
          if (msgStr.length > 0)
            text = msgStr
        }
      },
      onComplete: () => {
      },
      onExtension: () => {
      },
    },
  )
  return JSON.parse(text)
}
