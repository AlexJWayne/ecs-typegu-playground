import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import typegpuPlugin from "unplugin-typegpu/vite"
import type { UserConfig } from "vite"

export default {
  plugins: [react(), tailwindcss(), typegpuPlugin({})],
  base: "/ecs-typegu-playground/",
} satisfies UserConfig
