import tgpu from "typegpu"
import { arrayOf, builtin, u16, vec2f, vec4f } from "typegpu/data"

const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
const canvas = document.createElement("canvas")
let ctx: GPUCanvasContext
let root = await tgpu.init()

const indexBuffer = root
  .createBuffer(arrayOf(u16, 6), [0, 2, 1, 0, 3, 2])
  .$usage("index")

export function setupCanvasGl(): void {
  canvas.width = 800
  canvas.height = 800
  document.body.appendChild(canvas)

  ctx = canvas.getContext("webgpu") as GPUCanvasContext

  ctx.configure({
    device: root.device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  })

  render()
}

const vertex = tgpu["~unstable"].vertexFn({
  in: { idx: builtin.vertexIndex },
  out: { pos: builtin.position },
})(({ idx }) => {
  const vertices = [
    vec2f(-1, -1), //
    vec2f(1, -1),
    vec2f(1, 1),
    vec2f(-1, 1),
  ]
  return {
    pos: vec4f(vertices[idx], 0, 1),
  }
})

const frag = tgpu["~unstable"].fragmentFn({
  out: vec4f,
})(() => {
  return vec4f(0.25, 0, 0, 1)
})

const vertexLayout = tgpu.vertexLayout((n) => arrayOf(vec4f, n))
const pipeline = root["~unstable"]
  .withVertex(vertex, {})
  .withFragment(frag, { format: presentationFormat })
  .createPipeline()
  .withIndexBuffer(indexBuffer)

function render() {
  pipeline
    .withColorAttachment({
      view: ctx.getCurrentTexture().createView(),
      loadOp: "clear",
      storeOp: "store",
    })
    .drawIndexed(6)
}
