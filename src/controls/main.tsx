import { createRoot } from "react-dom/client"

import { bootstrapRenderer } from "../main"

import { App } from "./app"

const world = bootstrapRenderer()

const root = createRoot(document.getElementById("root")!)
root.render(<App world={world} />)
