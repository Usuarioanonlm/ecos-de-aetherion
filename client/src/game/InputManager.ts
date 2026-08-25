import type { SemanticInput } from "./types";

export class InputManager {
  private readonly keys = new Set<string>();
  private attackQueued = false;
  private absorbQueued = false;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) event.preventDefault();
    this.keys.add(code);
    if (code === "Space" && !event.repeat) this.attackQueued = true;
    if (code === "KeyF" && !event.repeat) this.absorbQueued = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
  }

  consume(): SemanticInput {
    const moveX = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    const moveY = Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) - Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    const input = { moveX, moveY, attack: this.attackQueued, absorb: this.absorbQueued };
    this.attackQueued = false;
    this.absorbQueued = false;
    return input;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.keys.clear();
  }
}
