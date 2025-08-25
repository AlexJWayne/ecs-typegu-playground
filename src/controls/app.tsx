import { type World, observe, onAdd, onRemove, query } from "bitecs"
import { useEffect, useState } from "react"

import { Position } from "../components"
import { Spawner } from "../spawners/component"

export function App({ world }: { world: World }) {
  const entities = useEcsQuery(world, Spawner)

  return (
    <div className="w-64 p-2">
      <ul className="text-neutral-400 font-mono">
        {entities.map((eid) => (
          <li key={eid}>
            #{eid} [{Position[eid].x.toFixed(2)}, {Position[eid].y.toFixed(2)}]
          </li>
        ))}
      </ul>
    </div>
  )
}

function useEcsQuery(world: World, component: unknown) {
  const [entities, setEntities] = useState(() => query(world, [component]))

  useEffect(() => {
    observe(world, onAdd(component), (eid) =>
      setEntities((entities) => [...entities, eid]),
    )
    observe(world, onRemove(component), (eid) =>
      setEntities((entities) => entities.filter((id) => id !== eid)),
    )
  }, [world])

  return entities
}
