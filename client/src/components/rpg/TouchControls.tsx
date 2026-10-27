import { useRef } from "react";
import type { PointerEvent } from "react";
import type { ControlAction } from "../../game/runtime/types";

type TouchAction = ControlAction | "collect";
type Props = { onAction: (action: TouchAction, down: boolean) => void };

const directions: Array<[TouchAction, string, string]> = [
  ["moveUp", "▲", "Mover para cima"],
  ["moveLeft", "◀", "Mover para esquerda"],
  ["moveDown", "▼", "Mover para baixo"],
  ["moveRight", "▶", "Mover para direita"],
];
const actions: Array<[TouchAction, string, string]> = [
  ["attack", "ATQ", "Atacar"],
  ["skill", "ÉTER", "Usar técnica de Éter"],
  ["collect", "ABS", "Absorver ou coletar"],
  ["interact", "FALAR", "Interagir"],
  ["dodge", "ESQ", "Esquivar"],
];

export default function TouchControls({ onAction }: Props) {
  const pointers = useRef(new Map<number, TouchAction>());
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const action = pointers.current.get(event.pointerId);
    if (!action) return;
    pointers.current.delete(event.pointerId);
    if (!Array.from(pointers.current.values()).includes(action))
      onAction(action, false);
  };
  const button = ([action, label, description]: [
    TouchAction,
    string,
    string,
  ]) => (
    <button
      key={action}
      type="button"
      aria-label={description}
      onPointerDown={event => {
        event.preventDefault();
        pointers.current.set(event.pointerId, action);
        event.currentTarget.setPointerCapture(event.pointerId);
        onAction(action, true);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerLeave={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) end(event);
      }}
    >
      {label}
    </button>
  );
  return (
    <div className="touch-controls" aria-label="Controles por toque">
      <div className="touch-dpad">{directions.map(button)}</div>
      <div className="touch-actions">{actions.map(button)}</div>
    </div>
  );
}
