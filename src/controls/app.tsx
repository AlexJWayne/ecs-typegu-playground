import {
  type EntityId,
  type World,
  observe,
  onAdd,
  onRemove,
  query,
  removeEntity,
} from "bitecs"
import { type ReactNode, useEffect, useState } from "react"
import { vec2f } from "typegpu/data"

import { Position, Selected } from "../components"
import { Mass } from "../mass/component"
import { polarToCartesian, rotateVec2 } from "../shader-lib"
import { Spawner, addSpawner } from "../spawners/component"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion"
import { Button } from "./components/button"
import { Input } from "./components/input"
import { Slider } from "./components/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/tabs"

export function App({ world }: { world: World }) {
  const spawers = useEcsQuery(world, Spawner)
  const warpers = useEcsQuery(world, Mass)

  const [selectedTab, setSelectedTab] = useState("spawners")
  const [selectedEntity, setSelectedEntity] = useState<EntityId | null>(null)
  const [arrayTimes, setArrayTimes] = useState<number>(3)

  return (
    <Tabs
      className="w-64 h-[1000px] pl-4"
      value={selectedTab}
      onValueChange={setSelectedTab}
    >
      <TabsList className="w-full">
        <TabsTrigger value="spawners">Spawners</TabsTrigger>
        <TabsTrigger value="warpers">Warpers</TabsTrigger>
      </TabsList>

      <TabsContent value="spawners">
        <Accordion
          type="single"
          collapsible
          value={selectedEntity === null ? "" : selectedEntity.toString()}
          onValueChange={(eidStr) => {
            const eid = eidStr ? +eidStr : null
            Selected.set(world, eid)
            setSelectedEntity(eid)
          }}
        >
          {spawers.map((eid, i) => (
            <AccordionItem key={eid} value={eid.toString()}>
              <AccordionTrigger>#{i + 1}</AccordionTrigger>
              <AccordionContent>
                <div className="flex gap-2 my-2 items-center">
                  <div>Mirror:</div>
                  <Button
                    variant="secondary"
                    onClick={() => mirrorSpawner(world, eid, "x")}
                    className="flex-1"
                  >
                    X
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => mirrorSpawner(world, eid, "y")}
                    className="flex-1"
                  >
                    Y
                  </Button>
                </div>
                <div className="flex gap-2 my-2 items-center">
                  <div>Radial:</div>
                  <Input
                    type="number"
                    value={arrayTimes}
                    onChange={(e) =>
                      setArrayTimes(parseInt(e.target.value) || 0)
                    }
                  />
                  <Button
                    variant="secondary"
                    onClick={() => arraySpawner(world, eid, arrayTimes)}
                    className="flex-1"
                  >
                    Clone
                  </Button>
                </div>
                <div className="flex gap-2 my-2">
                  <Button
                    variant="secondary"
                    onClick={() => removeEntity(world, eid)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
                <PropGroup name="Position: X,Y">
                  <PropSlider
                    min={-1}
                    max={1}
                    value={[Position[eid].x]}
                    onChange={(value) => (Position[eid].x = value[0])}
                  />
                  <PropSlider
                    min={-1}
                    max={1}
                    value={[Position[eid].y]}
                    onChange={(value) => (Position[eid].y = value[0])}
                  />
                </PropGroup>

                <PropGroup name="Direction">
                  <PropSlider
                    min={0}
                    max={Math.PI * 2}
                    value={[-Spawner.instance[eid].initialVel.direction]}
                    onChange={(value) =>
                      (Spawner.instance[eid].initialVel.direction = -value[0])
                    }
                  />
                </PropGroup>
                <PropGroup name="Spread">
                  <PropSlider
                    min={0}
                    max={Math.PI * 2}
                    value={[Spawner.instance[eid].initialVel.spread]}
                    onChange={(value) =>
                      (Spawner.instance[eid].initialVel.spread = value[0])
                    }
                  />
                </PropGroup>
                <PropGroup name="Speed">
                  <PropSlider
                    min={0}
                    max={1}
                    value={[
                      Spawner.instance[eid].initialVel.minSpeed,
                      Spawner.instance[eid].initialVel.maxSpeed,
                    ]}
                    onChange={(value) => {
                      Spawner.instance[eid].initialVel.minSpeed = value[0]
                      Spawner.instance[eid].initialVel.maxSpeed = value[1]
                    }}
                  />
                </PropGroup>
                <PropGroup name="Size">
                  <PropSlider
                    min={0.01}
                    max={0.5}
                    value={[Spawner.instance[eid].radius]}
                    onChange={(value) =>
                      (Spawner.instance[eid].radius = value[0])
                    }
                  />
                </PropGroup>
                <PropGroup name="Lifetime">
                  <PropSlider
                    min={0.25}
                    max={60}
                    value={[Spawner.instance[eid].lifetime]}
                    onChange={(value) => {
                      Spawner.instance[eid].lifetime = value[0]
                      Spawner.renderer[eid].resetParticles()
                    }}
                  />
                </PropGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex gap-2 my-2">
          <Button
            variant="secondary"
            onClick={() => clickAddSpawner(world)}
            className="flex-1"
          >
            Add
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="warpers">
        <Accordion type="single" collapsible>
          {warpers.map((eid, i) => (
            <AccordionItem key={eid} value={eid.toString()}>
              <AccordionTrigger>#{i + 1}</AccordionTrigger>
              <AccordionContent>
                <PropGroup name="Position: X,Y">
                  <PropSlider
                    min={-1}
                    max={1}
                    value={[Position[eid].x]}
                    onChange={(value) => (Position[eid].x = value[0])}
                  />
                  <PropSlider
                    min={-1}
                    max={1}
                    value={[Position[eid].y]}
                    onChange={(value) => (Position[eid].y = value[0])}
                  />
                </PropGroup>
                <PropGroup name="Force">
                  <PropSlider
                    min={-1}
                    max={1}
                    value={[-Mass[eid]]}
                    onChange={(value) => (Mass[eid] = -value[0])}
                  />
                </PropGroup>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TabsContent>
    </Tabs>
  )
}

function useEcsQuery(world: World, component: unknown) {
  const [entities, setEntities] = useState(() => query(world, [component]))

  useEffect(() => {
    const unsubscribeAdd = observe(world, onAdd(component), (eid) =>
      setEntities((entities) => [...entities, eid]),
    )
    const unsubscribeRemove = observe(world, onRemove(component), (eid) =>
      setEntities((entities) => entities.filter((id) => id !== eid)),
    )
    return () => {
      unsubscribeAdd()
      unsubscribeRemove()
    }
  }, [world])

  return entities
}

function PropGroup({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 mb-4">
      <div>{name}</div>
      {children}
    </div>
  )
}

function PropSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number
  max: number
  value: number[]
  onChange: (value: number[]) => void
}) {
  const [valueState, setValueState] = useState(value)
  return (
    <Slider
      className="my-0.5"
      min={min}
      max={max}
      value={valueState}
      step={0.001}
      onValueChange={(value) => {
        setValueState(value)
        onChange(value)
      }}
    />
  )
}

function clickAddSpawner(world: World) {
  addSpawner(world, {
    pos: vec2f(),
    initialVel: {
      direction: 0,
      spread: 0,
      minSpeed: 0,
      maxSpeed: 0.1,
    },
    radius: 0.05,
    lifetime: 25,
  })
}

function mirrorSpawner(world: World, eid: EntityId, axis: "x" | "y") {
  const mirrorAngle = axis === "x" ? Math.PI : 0
  let direction = mirrorAngle - Spawner.instance[eid].initialVel.direction
  if (direction < 0) direction += Math.PI * 2
  if (direction > Math.PI * 2) direction -= Math.PI * 2

  const pos =
    axis === "x"
      ? vec2f(-Position[eid].x, Position[eid].y)
      : vec2f(Position[eid].x, -Position[eid].y)

  addSpawner(world, {
    pos,
    initialVel: { ...Spawner.instance[eid].initialVel, direction },
    radius: Spawner.instance[eid].radius,
    lifetime: Spawner.instance[eid].lifetime,
  })
}

const TAU = Math.PI * 2
function arraySpawner(world: World, eid: EntityId, times: number) {
  if (times <= 1) return

  for (let i = 1; i < times; i++) {
    const angle = i * (TAU / times)
    let direction = Spawner.instance[eid].initialVel.direction + angle
    if (direction < 0) direction += Math.PI * 2
    if (direction > Math.PI * 2) direction -= Math.PI * 2

    addSpawner(world, {
      pos: rotateVec2(Position[eid], angle),
      initialVel: { ...Spawner.instance[eid].initialVel, direction },
      radius: Spawner.instance[eid].radius,
      lifetime: Spawner.instance[eid].lifetime,
    })
  }
}
