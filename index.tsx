import { renderToString } from 'react-dom/server'
import { EventEmitter } from 'node:events'

const appendIndex = (path: string) =>
  path.endsWith('/') ? path.concat('index.html') : path

const pubsub = new EventEmitter()

const state = {
  globalCount: 0
}

const server = Bun.serve({
  fetch(req, svr) {
    if (svr.upgrade(req, {data: {}})) {
      return
    }

    const { pathname } = new URL(req.url)
    const publicPathname = appendIndex(pathname)
    
    return new Response(Bun.file(`public${publicPathname}`))
  },
  websocket: {
    perMessageDeflate: true,
    async open(ws) {
      console.log(`ws conn opened to ${ws.remoteAddress}`)
      ws.data.count = 0
      ws.data.timerHandles = []
      ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={state.globalCount} />))
      ws.data.timerHandles.push(setInterval(() => {
        ws.data.count += 1
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={state.globalCount} />))
      }, 1000))
      pubsub.on('change', () => {
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={state.globalCount} />))
      })
    },
    close(ws, code, reason) {
      ws.data.timerHandles.forEach(clearInterval)
    },
    message(ws, message) {
      if (message === 'inc100') {
        ws.data.count += 100
        ws.sendText(renderToString(<Counter count={ws.data.count} globalCount={state.globalCount} />))
      }
      if (message === 'global-inc') {
        state.globalCount += 1
        const output = renderToString(<Counter count={ws.data.count} globalCount={state.globalCount} />)
        pubsub.emit('change')
        ws.subscribe
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
