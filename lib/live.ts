import { renderToString } from 'react-dom/server'
import { EventEmitter } from 'node:events'
import type { Serve, ServerWebSocket } from 'bun'

interface FSA<TPayload = {}> {
  type: string
  payload?: TPayload
}

interface LiveApp<TLocal, TShared> {
  dispatch?: ({local, message, shared}: {local: TLocal, message: FSA, shared: TShared}) => void
  mount?: ({addTimer, local, shared}: {addTimer: (interval : number, message: FSA) => void, local: TLocal, shared: TShared}) => void
  render: ({local, shared}: {local: TLocal, shared: TShared}) => JSX.Element | null
  local?: TLocal
  shared?: TShared
}

interface LiveData<TLocal> {
  local: TLocal
  timerHandles: Timer[]
  onMultiplayer: (...args: any[]) => void
}

export const live = <TLocal extends {}, TShared extends {}>({
  dispatch = () => {}, 
  mount = () => {}, 
  render, 
  shared = {} as TShared,
  local = {} as TLocal,
}: LiveApp<TLocal, TShared>) => {
  const createRenderAfterChangeProxy = (ws: ServerWebSocket<LiveData<TLocal>>, watched: object) => 
    addDeepSetterHook(watched, () => {
      frameworkRender(ws)
    })

  const createPublishAndRenderAfterChangeProxy = (ws: ServerWebSocket<LiveData<TLocal>>, watched: object) =>
    addDeepSetterHook(watched, () => {
      frameworkRender(ws)
      pubsub.emit('multiplayer')
    })

  // HACK: We are likely over-calling `afterSet` here X times,
  //  once for each level of nesting. 
  //  Should create an inner function in here that ensures it's called once
  //  per branch, perhaps
  const addDeepSetterHook = (o: any, afterSet: Function) => {
    return new Proxy(o, {
      set(obj, prop, value) {
        if (value && typeof value === 'object') {
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

  const frameworkRender = (ws: ServerWebSocket<LiveData<TLocal>>) => {
    ws.sendText(renderToString(render({local: ws.data.local, shared})))
  }

  const addTimer = (ws: ServerWebSocket<LiveData<TLocal>>, interval: number, message: FSA) => {
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
        local: structuredClone(local),
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
          addTimer: (interval: number, message: FSA) => {
            addTimer(ws, interval, message)
          },
          local: createRenderAfterChangeProxy(ws, ws.data.local),
          shared: createPublishAndRenderAfterChangeProxy(ws, shared),
        })
        ws.data.onMultiplayer = () => {
          frameworkRender(ws)
        }
        pubsub.on('multiplayer', ws.data.onMultiplayer)
        frameworkRender(ws)
      },
      close(ws) {
        pubsub.off('multiplayer', ws.data.onMultiplayer)
        ws.data.timerHandles.forEach(clearInterval)
      },
      message(ws, message) {
        dispatch({
          local: createRenderAfterChangeProxy(ws, ws.data.local),
          shared: createPublishAndRenderAfterChangeProxy(ws, shared),
          message: JSON.parse(String(message)) as FSA,
        })
      },
    }
  } satisfies Serve<LiveData<TLocal>>
}
