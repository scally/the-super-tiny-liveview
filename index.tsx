import { renderToString } from 'react-dom/server'
import { EventEmitter } from 'node:events'
import type { ServerWebSocket } from 'bun'

const appendIndex = (path: string) =>
  path.endsWith('/') ? path.concat('index.html') : path

const pubsub = new EventEmitter()

const state = {
  globalCount: 0
}

interface WSData {
  count: number

  shared: typeof state,

  timerHandles: Timer[]
  onchange: (...args: any[]) => void
}

const server = Bun.serve({
  fetch(req, svr) {
    if (svr.upgrade(req, {data: {
      count: 0,
      timerHandles: new Array<Timer>,
    } as WSData})) {
      return
    }

    const { pathname } = new URL(req.url)
    const publicPathname = appendIndex(pathname)
    
    return new Response(Bun.file(`public${publicPathname}`))
  },
  websocket: {
    perMessageDeflate: true,
    async open(ws: ServerWebSocket<WSData>) {
      console.log(`ws conn opened to ${ws.remoteAddress}`)
      ws.data.shared = state
      // Initial Render
      ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={ws.data.shared.globalCount} />))
      // Timer -> State Change -> Rerender
      ws.data.timerHandles.push(setInterval(() => {
        ws.data.count += 1
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={ws.data.shared.globalCount} />))
      }, 1000))
      // Topic subscriber -> Rerender
      ws.data.onchange = () => {
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={ws.data.shared.globalCount} />))
      }
      pubsub.on('change', ws.data.onchange)
    },
    close(ws, code, reason) {
      // Finalize everything we opened/subscribed
      pubsub.off('change', ws.data.onchange)
      ws.data.timerHandles.forEach(clearInterval)
    },
    message(ws, message) {
      // State change -> Rerender
      if (message === 'inc100') {
        ws.data.count += 100
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={ws.data.shared.globalCount} />))
      }
      // State change -> Rerender -> Publish
      if (message === 'global-inc') {
        ws.data.shared.globalCount += 1
        const output = renderToString(<Counter count={ws.data.count} globalCount={ws.data.shared.globalCount} />)
        pubsub.emit('change')
        ws.sendText(output)
      }
    },
  },
})

// initial render ->
// receive action | timer event | pubsub event -> re-render

const Counter = ({count, globalCount}: {count: number, globalCount: number}) => {
  return (
    <div>
      <CounterPart label='Local Count' count={count} />
      <CounterPart label='Global Count' count={globalCount} />
      <button type='button' data-stl-action='inc100'>Local Inc 100</button>
      <button type='button' data-stl-action='global-inc'>Global Inc 1</button>
    </div>
  )
}

const CounterPart = ({count, label}: {count: number, label: string}) => {
  return (
    <h1>{label}: {count}</h1>
  )
}

console.log(`Server running at http://${server.hostname}:${server.port}`)

// Prototype DSL
// run({
//   mount: () => {
//     local.count = 8
//     addTimer(1000, 'tick')
//   },
//   render: () => {
//     <Counter count={local.count} globalCount={shared.globalCount} />
//   },
//   dispatch: () => {
//     switch (message) {
//       case 'tick':
//         local.count += 1
//       case 'inc100':
//         local.count += 100
//         break
//       case 'global-inc':
//         shared.count += 1
//         break
//       default:
//         break
//     }
//   },
// })
