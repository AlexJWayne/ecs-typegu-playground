import type { UserConfig } from "vite"
import typegpuPlugin from "unplugin-typegpu/vite"

export default {
  plugins: [typegpuPlugin({})],
} satisfies UserConfig
