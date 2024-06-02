import { live } from "./lib/live"

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
    mount: ({addTimer, local}) => {
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
