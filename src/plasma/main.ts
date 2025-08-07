import tgpu from "typegpu"
import { setupParticles } from "./particles"
import { vec2f, type v2f } from "typegpu/data"

export const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
export const canvas = document.getElementById("canvas") as HTMLCanvasElement
export const root = await tgpu.init()
export const canvasSize = 1000

export let ctx: GPUCanvasContext

export let mouse = vec2f()
export let forceScale = 1
export let mouseDown = false

export function setupCanvas(): void {
  canvas.width = canvasSize
  canvas.height = canvasSize

  canvas.onmousemove = (event) => {
    if (!mouseDown) return
    setMousePosition(event)
  }
  canvas.onmousedown = (event) => {
    mouseDown = true
    setMousePosition(event)
  }
  canvas.onmouseup = () => {
    mouseDown = false
  }

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })
}

function setMousePosition(event: MouseEvent): void {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / canvasSize) * 2 - 1
  mouse.y = -(((event.clientY - rect.top) / canvasSize) * 2 - 1)
}

function main() {
  setupCanvas()
  const { renderParticles, resetParticles } = setupParticles(root)

  document.getElementById("reset")!.onclick = () => {
    mouse = vec2f()
    resetParticles()
  }

  function render() {
    renderParticles(ctx, mouse, forceScale)
    requestAnimationFrame(render)
  }
  render()
}

if (location.search === "?plasma") main()
