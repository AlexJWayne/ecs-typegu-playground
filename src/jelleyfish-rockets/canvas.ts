import { type World, query } from "bitecs"

import { Cell, Lifetime, Position, Radius, TrailParticle } from "./components"

let canvas = document.createElement("canvas")
let ctx: CanvasRenderingContext2D

export function setupCanvas(): HTMLCanvasElement {
  canvas.width = 800
  canvas.height = 800
  document.body.appendChild(canvas)
  return canvas
}

export function renderWorld(world: World) {
  ctx = ctx || canvas.getContext("2d")
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  renderTwinkles(world, ctx)
  renderCells(world, ctx)
}

function renderTwinkles(world: World, ctx: CanvasRenderingContext2D) {
  for (const eid of query(world, [TrailParticle, Position, Lifetime])) {
    ctx.beginPath()
    const radius = Radius[eid]
    ctx.rect(
      Position.x[eid] - radius,
      Position.y[eid] - radius,
      radius * 2,
      radius * 2,
    )

    const completion = Lifetime.completion(eid)
    const r = Math.floor((1 - completion) * 255)
    const b = Math.floor(completion * 255)
    const a = completion < 0.5 ? 1 : (1 - completion) * 2
    ctx.fillStyle = `rgba(${r},0,${b},${a})`
    ctx.fill()
  }
}

function renderCells(world: World, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = `green`

  ctx.beginPath()
  for (const eid of query(world, [Cell, Position, Radius])) {
    ctx.moveTo(Position.x[eid], Position.y[eid])
    ctx.arc(
      Position.x[eid], //
      Position.y[eid],
      Radius[eid],
      0,
      Math.PI * 2,
    )
  }
  ctx.fill()
}
