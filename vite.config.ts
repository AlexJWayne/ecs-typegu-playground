import typegpuPlugin from "unplugin-typegpu/vite"
import type { UserConfig } from "vite"

export default {
  plugins: [typegpuPlugin({})],
  base: "/ecs-typegu-playground/",
} satisfies UserConfig
