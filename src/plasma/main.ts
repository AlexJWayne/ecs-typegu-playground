import tgpu from "typegpu"
import { renderParticles, setupParticles } from "./particles"
import { vec2f } from "typegpu/data"

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
export const canvas = document.createElement("canvas")
export const root = await tgpu.init()
export const canvasSize = 1000

export let ctx: GPUCanvasContext

export let mouse = vec2f()
export let forceScale = 0

export function setupCanvas(): void {
  document.body.style.display = "flex"
  document.body.style.alignItems = "center"
  document.body.style.justifyContent = "center"
  document.body.style.backgroundColor = "#111"

  canvas.width = canvasSize
  canvas.height = canvasSize
  canvas.style.backgroundColor = "#000"
  document.body.appendChild(canvas)

  const rect = canvas.getBoundingClientRect()
  canvas.onmousemove = (event) => {
    mouse.x = ((event.clientX - rect.left) / canvasSize) * 2 - 1
    mouse.y = -(((event.clientY - rect.top) / canvasSize) * 2 - 1)
  }
  canvas.onmouseenter = () => (forceScale = 1)
  canvas.onmouseleave = () => (forceScale = 0)
  canvas.onmousedown = () => (forceScale = 2)
  canvas.onmouseup = () => (forceScale = 1)

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })
}

function main() {
  console.log("mouse explosions")
  setupCanvas()
  setupParticles()
  render()
}

function render() {
  renderParticles()
  requestAnimationFrame(render)
}
if (location.search === "?plasma") main()
