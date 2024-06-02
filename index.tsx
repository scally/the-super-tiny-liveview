import { renderToString } from 'react-dom/server'
import { EventEmitter } from 'node:events'
import type { Serve, ServerWebSocket } from 'bun'

interface LiveApp<TLocal, TShared> {
  dispatch: ({local, message, shared}: {local: TLocal, message: string, shared: TShared}) => void
  mount: ({addTimer, local, shared}: {addTimer: Function, local: TLocal, shared: TShared}) => void
  render: ({local, shared}: {local: TLocal, shared: TShared}) => JSX.Element
  shared: TShared
}

const live = <TLocal, TShared>({dispatch, mount, render, shared}: LiveApp<TLocal, TShared>) => {
  const createRenderAfterChangeProxy = (ws: ServerWebSocket, watched: object) => 
    addDeepSetterHook(watched, () => {
      frameworkRender(ws)
    })

  const createPublishAndRenderAfterChangeProxy = (ws: ServerWebSocket, watched: object) =>
    addDeepSetterHook(watched, () => {
      frameworkRender(ws)
      pubsub.emit('multiplayer')
    })

  // HACK: We are likely over-calling `afterSet` here X times,
  //  once for each level of nesting. 
  //  Should create an inner function in here that ensures it's called once
  //  per branch, perhaps
  const addDeepSetterHook = (o: object, afterSet: Function) => {
    return new Proxy(o, {
      set(obj, prop, value) {
        if (typeof value === 'object') {
          obj[prop] = addDeepSetterHook(value, afterSet)
        } else {
          obj[prop] = value
        }

        afterSet()

        return true
      }
    })
  }

  const pubsub = new EventEmitter()

  const frameworkRender = (ws: ServerWebSocket) => {
    ws.sendText(renderToString(render({local: ws.data.local, shared})))
  }

  const addTimer = (ws: ServerWebSocket, interval: number, message: string) => {
    ws.data.timerHandles.push(
      setInterval(() => {
        dispatch({
          local: ws.data.local,
          message,
          shared,
        })
        frameworkRender(ws)
      }, interval)
    )
  }

  return {
    fetch(req, svr) {
      if (svr.upgrade(req, {data: {
        local: {},
        shared,
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
          shared: createPublishAndRenderAfterChangeProxy(ws, shared),
        })
        ws.data.onMultiplayer = () => {
          frameworkRender(ws)
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
          shared: createPublishAndRenderAfterChangeProxy(ws, shared),
          message: String(message),
        })
      },
    }
  } satisfies Serve
}

interface AppLocal {
  nums: number[]
  count: number
}

interface AppShared {
  count: number
}

const server = Bun.serve(
  live<AppLocal, AppShared>({
    shared: {
      count: 0,
    },
    mount: ({addTimer, local, shared}) => {
      local.count = 8
      local.nums = []
      addTimer(1000, 'tick')
      addTimer(2000, 'tick2')
    },
    render: ({local, shared}) => {
      return (
        <div>
          <CounterPart label='Local Count' count={local.count} />
          <CounterPart label='Global Count' count={shared.count} />
          {
            local.nums?.map(n => <div key={n}>{n}</div>)
          }
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
        case 'tick2':
          local.nums.push(local.nums.length)
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
