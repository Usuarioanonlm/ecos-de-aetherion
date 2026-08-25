import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Player } from "./Player";
import { setDrawOrder } from "./visuals";

export class Enemy {
  health = 3;
  alive = true;
  private attackCooldown = 0.9;
  private pulse = 0;

  constructor(readonly mesh: Mesh, readonly label: string) {}

  get x() { return this.mesh.position.x; }
  get y() { return this.mesh.position.y; }

  update(player: Player, delta: number) {
    if (!this.alive) return 0;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.pulse += delta * 4;

    if (distance > 1.18 && distance < 5.8) {
      const speed = 0.58;
      this.mesh.position.x += (dx / distance) * speed * delta;
      this.mesh.position.y += (dy / distance) * speed * delta;
    }
    this.mesh.scaling.x = 1 + Math.sin(this.pulse) * 0.018;
    this.mesh.scaling.y = 1 + Math.sin(this.pulse) * 0.018;
    setDrawOrder(this.mesh, this.mesh.position.y, -0.05);

    if (distance <= 1.18 && this.attackCooldown <= 0) {
      this.attackCooldown = 1.15;
      return 7;
    }
    return 0;
  }

  takeHit() {
    if (!this.alive) return false;
    this.health -= 1;
    this.mesh.scaling.x = 1.18;
    this.mesh.scaling.y = 0.82;
    if (this.health > 0) return false;
    this.alive = false;
    this.mesh.dispose();
    return true;
  }
}
