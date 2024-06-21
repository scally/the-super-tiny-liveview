import { live } from "../lib/live"

console.log(Bun.serve(
  live({
    render() {
      return (
        <h1>hello world</h1>
      )
    },
  })
).url.href)