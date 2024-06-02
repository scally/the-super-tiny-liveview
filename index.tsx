import { renderToString } from 'react-dom/server'
import { EventEmitter } from 'node:events'
import type { Serve, ServerWebSocket } from 'bun'

interface LiveApp<TLocal = {}, TShared = {}> {
  dispatch: ({local, message, shared}: {local: TLocal, message: string, shared: TShared}) => void
  mount: ({addTimer, local, shared}: {addTimer: Function, local: TLocal, shared: TShared}) => void
  render: ({local, shared}: {local: TLocal, shared: TShared}) => JSX.Element
}

const live = ({dispatch, mount, render}: LiveApp) => {
  const state = {
    count: 0
  }

  // TODO: Proxy only goes one level deep, so nested objects within aren't "seen"
  //    to be updated
  const createRenderAfterChangeProxy = (ws: ServerWebSocket, watched: object, afterHook?: () => void) => new Proxy(watched, {
    set(obj, prop, value) {
      obj[prop] = value

      frameworkRender(ws, {
        local: ws.data.local,
        shared: ws.data.shared,
      })

      if (afterHook) {
        afterHook()
      }

      return true
    },
  })

  const createPublishAndRenderAfterChangeProxy = (ws: ServerWebSocket, watched: object) => createRenderAfterChangeProxy(ws, watched, () => {
    pubsub.emit('multiplayer')
  })

  const pubsub = new EventEmitter()

  const frameworkRender = (ws: ServerWebSocket, {local, shared}: any) => {
    ws.sendText(renderToString(render({local, shared})))
  }

  const addTimer = (ws: ServerWebSocket, interval: number, message: string) => {
    ws.data.timerHandles.push(
      setInterval(() => {
        dispatch({
          local: ws.data.local,
          message,
          shared: ws.data.shared,
        })
        frameworkRender(ws, {
          local: ws.data.local,
          shared: ws.data.shared,
        })
      }, interval)
    )
  }

  return {
    fetch(req, svr) {
      if (svr.upgrade(req, {data: {
        local: {},
        shared: state,
        timerHandles: new Array<Timer>(),
      }})) {
        return
      }

      const appendIndex = (path: string) =>
        path.endsWith('/') ? path.concat('index.html') : path
  
      const { pathname } = new URL(req.url)
      const publicPathname = appendIndex(pathname)
      
      return new Response(Bun.file(`public${publicPathname}`))
    },
    websocket: {
      perMessageDeflate: true,
      open(ws) {
        mount({
          addTimer: (interval: number, message: string) => {
            addTimer(ws, interval, message)
          },
          local: createRenderAfterChangeProxy(ws, ws.data.local),
          shared: createPublishAndRenderAfterChangeProxy(ws, ws.data.shared),
        })
        ws.data.onMultiplayer = () => {
          frameworkRender(ws, {
            local: ws.data.local,
            shared: ws.data.shared,
          })
        }
        pubsub.on('multiplayer', ws.data.onMultiplayer)
      },
      close(ws) {
        pubsub.off('multiplayer', ws.data.onMultiplayer)
        ws.data.timerHandles.forEach(clearInterval)
      },
      message(ws, message) {
        dispatch({
          local: createRenderAfterChangeProxy(ws, ws.data.local),
          shared: createPublishAndRenderAfterChangeProxy(ws, ws.data.shared),
          message: String(message),
        })
      },
    }
  } satisfies Serve
}

const server = Bun.serve(
  live({
    mount: ({addTimer, local, shared}) => {
      local.count = 8
      addTimer(1000, 'tick')
    },
    render: ({local, shared}) => {
      return (
        <div>
          <CounterPart label='Local Count' count={local.count} />
          <CounterPart label='Global Count' count={shared.count} />
          <button type='button' data-stl-action='inc100'>Local Inc 100</button>
          <button type='button' data-stl-action='global-inc'>Global Inc 1</button>
        </div>
      )
    },
    dispatch: ({local, message, shared}) => {
      switch (message) {
        case 'tick':
          local.count += 1
          break
        case 'inc100':
          local.count += 100
          break
        case 'global-inc':
          shared.count += 1
          break
        default:
          break
      }
    },
  })
)

const CounterPart = ({count, label}: {count: number, label: string}) => {
  return (
    <h1>{label}: {count}</h1>
  )
}

console.log(`Server running at http://${server.hostname}:${server.port}`)
