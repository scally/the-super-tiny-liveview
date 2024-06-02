import morphdom from 'morphdom'

const ws = new WebSocket('/')
ws.addEventListener('open', () => {
  // TODO: Could be a DOM listener instead?
  // Send action up to server
  document.querySelector('[data-stl-container]').addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-stl-action')
    if (!action) return

    const payload = e.target.getAttributeNames().filter(attr => attr.startsWith('data-stl-payload')).reduce((prev, curr) => {
      const newKey = curr.replace('data-stl-payload-', '')
      prev[newKey] = e.target.getAttribute(curr)
      return prev
    }, {})

    const message = JSON.stringify({
      type: action,
      payload, 
    })

    ws.send(message)
  })
})

// A message is replacement HTML, use morphdom to stir into existing HTML
ws.addEventListener('message', ({data}) => {
  morphdom(document.querySelector('[data-stl-container]').children[0], data)
})

ws.addEventListener('close', () => {
  console.log('socket closed')
  // re-open ?
})

ws.addEventListener('error', e => {
  console.error(e)
})
