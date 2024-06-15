import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { live } from '../lib/live'
import type { Server } from 'bun'

let server: Server

describe('live websocket integration', () => {
  beforeEach(() => {
    server = Bun.serve({...live({
      local: {
        count: 0
      },
      shared: {
        count: 0
      },
      dispatch({local, message, shared}) {
        switch (message.type) {
          case 'inc-local': 
            local.count += 1
          break
          case 'inc-shared':
            shared.count += 1
          break
        }
      },
      render({local, shared}) {
        return (
          <div>
            <p>{local.count}</p>
            <p>{shared.count}</p>
            <button type='button' data-stl-action='inc-local'>inc local</button>
            <button type='button' data-stl-action='inc-shared'>inc shared</button>
          </div>
        )
      }
    }),
    port: 9999,
  })
  })

  afterEach(() => {
    server.stop(true)    
  })

  it('multiplayer works', async () => {
    const client1 = new WebSocket('ws://localhost:9999')
    const client2 = new WebSocket('ws://localhost:9999')

    const client2Messages = Array<string>()
    client2.addEventListener('message', ({data}) => {
      client2Messages.push(data)
    })
    client1.addEventListener('open', () => {
      client1.send(JSON.stringify({
        type: 'inc-shared',
        payload: {},
      }))
    })
    
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(client2Messages).toMatchSnapshot()
  })
})