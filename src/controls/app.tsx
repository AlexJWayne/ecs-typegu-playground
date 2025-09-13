import {
  type EntityId,
  type World,
  observe,
  onAdd,
  onRemove,
  query,
} from "bitecs"
import { type ReactNode, useEffect, useState } from "react"

import { Position, Selected } from "../components"
import { Mass } from "../mass/component"
import { Spawner } from "../spawners/component"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion"
import { Slider } from "./components/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/tabs"

export function App({ world }: { world: World }) {
  const spawers = useEcsQuery(world, Spawner)
  const attractors = useEcsQuery(world, Mass)

  const [selectedTab, setSelectedTab] = useState("spawners")
  const [selectedEntity, setSelectedEntity] = useState<EntityId | null>(null)

  return (
    <Tabs
      className="w-64 h-[1000px] pl-4"
      value={selectedTab}
      onValueChange={setSelectedTab}
    >
      <TabsList className="w-full">
        <TabsTrigger value="spawners">Spawners</TabsTrigger>
        <TabsTrigger value="attractors">Attractors</TabsTrigger>
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
                    value={[Spawner.instance[eid].initialVel.direction]}
                    onChange={(value) => {
                      Spawner.instance[eid].initialVel.direction = value[0]
                    }}
                  />
                </PropGroup>
                <PropGroup name="Spread">
                  <PropSlider
                    min={0}
                    max={Math.PI * 2}
                    value={[Spawner.instance[eid].initialVel.spread]}
                    onChange={(value) => {
                      Spawner.instance[eid].initialVel.spread = value[0]
                    }}
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TabsContent>

      <TabsContent value="attractors">
        <Accordion type="single" collapsible>
          {attractors.map((eid, i) => (
            <AccordionItem key={eid} value={eid.toString()}>
              <AccordionTrigger>#{i + 1}</AccordionTrigger>
              <AccordionContent>Not Implemented</AccordionContent>
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
    observe(world, onAdd(component), (eid) =>
      setEntities((entities) => [...entities, eid]),
    )
    observe(world, onRemove(component), (eid) =>
      setEntities((entities) => entities.filter((id) => id !== eid)),
    )
  }, [world])

  return entities
}

function PropGroup({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
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
