import { live } from "../lib/live"

console.log(Bun.serve(
  live({
    local: {
      count: 0,
      showButton: false,
    },
    dispatch({local, message}) {
      switch (message.type) {
        case 'toggle':
          local.showButton = !local.showButton
        break
        case 'inc':
          local.count += 1
        break
      }
    },
    render({local}) {
      return (
        <div style={{flexDirection: 'column', display: 'flex'}}>
          <button data-stl-action='toggle'>Toggle inc button</button>
          {
            local.showButton && <button data-stl-action='inc'>Inc</button>
          }
          <div>Count: {local.count}</div>
        </div>
      )
    },
  })
).url.href)