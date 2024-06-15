# the-super-tiny-liveview

## why

There are lots of cool liveview implementations out there already!

I wanted to break down the concept as simply as I could to get a good understanding of how they work behind the scenes.

Along the way I thought maybe a tiny example without many dependencies or features would help me & others understand how LiveView style webapps function.

The focus now is sharpening it into a tiny, fun DSL to make quick & dirty multiplayer apps simple to build.

*DANGER*

*This was not built with performance and best-practices in mind!*

*If you use this in prod you might be sad*

## how

To install dependencies:

```bash
bun install
```

To run:

```bash
bun examples/kitchen-sink-counter.tsx
```

This project was created using `bun init` in bun v1.1.10. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Docs

live view apps only require a `render` function. you can also supply:
* mount - called on app startup, can be used to add timers
* dispatch - called when a client dispatches an action, or when a timer fires
* local/shared - the initial values for local (per-socket) data and data shared by all sockets

`data-stl-action`
add this attribute to a clickable DOM element to dispatch an action to your app's `dispatch` function

if you need a more complex payload, add `data-stl-payload-foo='bar'` to add the payload `{foo: bar}` to your action

## Examples

See ./examples

Run with `bun ./examples/<name>`