import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { setDrawOrder } from "./visuals";

export class Player {
  readonly maxHealth = 100;
  health = 100;
  essence = 0;
  traitUnlocked = false;
  private attackCooldown = 0;
  private attackPulse = 0;
  private movePhase = 0;

  constructor(readonly mesh: Mesh) {}

  get x() { return this.mesh.position.x; }
  get y() { return this.mesh.position.y; }

  move(x: number, y: number, delta: number, bounds: { left: number; right: number; top: number; bottom: number }) {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= 0) return;
    const speed = 3.1;
    this.mesh.position.x = Math.max(bounds.left, Math.min(bounds.right, this.mesh.position.x + (x / magnitude) * speed * delta));
    this.mesh.position.y = Math.max(bounds.bottom, Math.min(bounds.top, this.mesh.position.y + (y / magnitude) * speed * delta));
    this.movePhase += delta * 11;
  }

  beginAttack() {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 0.38;
    this.attackPulse = 0.24;
    return true;
  }

  update(delta: number) {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.attackPulse = Math.max(0, this.attackPulse - delta);
    const breathe = 1 + Math.sin(this.movePhase) * 0.035;
    const strike = this.attackPulse > 0 ? 1.18 : 1;
    this.mesh.scaling.x = breathe * strike;
    this.mesh.scaling.y = breathe * strike;
    setDrawOrder(this.mesh, this.mesh.position.y, -0.2);
  }

  receiveDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
  }

  restore() {
    this.health = this.maxHealth;
    this.mesh.position.x = -0.45;
    this.mesh.position.y = -1.65;
  }
}
