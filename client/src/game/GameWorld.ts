import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";
import { clearingUrl } from "./assetUrls";
import { COLORS, VILLAGE_POSITION, WOLF_POSITIONS, WORLD_BOUNDS } from "./config";
import { Enemy } from "./Enemy";
import { InputManager } from "./InputManager";
import { Player } from "./Player";
import type { HudSnapshot } from "./types";
import { createImagePlane, createTintedPlane, setDrawOrder } from "./visuals";

type Essence = { mesh: ReturnType<typeof MeshBuilder.CreatePlane>; x: number; y: number; phase: number };
type QuestStage = "clear" | "village" | "complete";

export class GameWorld {
  private readonly input = new InputManager();
  private readonly player: Player;
  private readonly enemies: Enemy[];
  private readonly essences: Essence[] = [];
  private readonly questMarker: ReturnType<typeof MeshBuilder.CreatePlane>;
  private stage: QuestStage = "clear";
  private notice = "A Ruptura deixou o Éter inquieto. A vila precisa de você.";
  private hudElapsed = 0;
  private elapsed = 0;
  private lastHitNotice = 0;

  constructor(
    private readonly scene: Scene,
    private readonly isDemo: boolean,
    private readonly onHudChange: (snapshot: HudSnapshot) => void,
  ) {
    this.scene.clearColor = new Color4(0.026, 0.07, 0.065, 1);
    this.createEnvironment();

    const playerMesh = this.createSlimeMarker();
    playerMesh.position = new Vector3(-0.45, -1.65, -0.2);
    this.player = new Player(playerMesh);

    this.enemies = WOLF_POSITIONS.map((position, index) => {
      const mesh = this.createWolfMarker(index);
      mesh.position = new Vector3(position.x, position.y, 0);
      return new Enemy(mesh, `Lobo Primordial ${index + 1}`);
    });

    this.questMarker = this.createQuestMarker();
    this.scene.onBeforeRenderObservable.add(() => this.update(Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.05)));
    this.emitHud();
  }

  private createEnvironment() {
    const background = createImagePlane("primordial-clearing", this.scene, clearingUrl, 20, 11.25);
    background.position.z = 4;
    const veil = createTintedPlane("forest-veil", this.scene, 20, 11.25, Color3.FromHexString("#0b1b22"), 0.18);
    veil.position.z = 3.8;

    [[-4.7, 2.65], [1.1, -2.5], [5.55, 2.5]].forEach((position, index) => {
      const rift = createTintedPlane(`ether-rift-${index}`, this.scene, 0.08, 0.78, Color3.FromHexString(COLORS.ether), 0.9);
      rift.position = new Vector3(position[0], position[1], 0.6);
      rift.rotation.z = 0.55 + index * 0.28;
      setDrawOrder(rift, position[1], 0.5);
    });
  }

  private createSlimeMarker() {
    const body = MeshBuilder.CreateDisc("slime-hero", { radius: 0.48, tessellation: 32 }, this.scene);
    const bodyMaterial = new StandardMaterial("slime-hero-material", this.scene);
    bodyMaterial.emissiveColor = Color3.FromHexString("#62c887");
    bodyMaterial.disableLighting = true;
    bodyMaterial.alpha = 0.94;
    body.material = bodyMaterial;

    const etherMark = createTintedPlane("slime-ether-mark", this.scene, 0.055, 0.52, Color3.FromHexString(COLORS.ether), 0.98);
    etherMark.parent = body;
    etherMark.position = new Vector3(0.02, 0, -0.04);
    etherMark.rotation.z = 0.55;
    return body;
  }

  private createWolfMarker(index: number) {
    const body = MeshBuilder.CreateDisc(`wolf-${index}`, { radius: 0.5, tessellation: 6 }, this.scene);
    const bodyMaterial = new StandardMaterial(`wolf-${index}-material`, this.scene);
    bodyMaterial.emissiveColor = Color3.FromHexString("#263844");
    bodyMaterial.disableLighting = true;
    bodyMaterial.alpha = 0.95;
    body.material = bodyMaterial;
    body.scaling.x = 1.3;
    body.scaling.y = 0.78;

    const eye = MeshBuilder.CreateDisc(`wolf-${index}-eye`, { radius: 0.07, tessellation: 16 }, this.scene);
    const eyeMaterial = new StandardMaterial(`wolf-${index}-eye-material`, this.scene);
    eyeMaterial.emissiveColor = Color3.FromHexString(COLORS.ether);
    eyeMaterial.disableLighting = true;
    eye.material = eyeMaterial;
    eye.parent = body;
    eye.position = new Vector3(0.22, 0.05, -0.04);
    return body;
  }

  private createQuestMarker() {
    const marker = createTintedPlane("village-marker", this.scene, 0.4, 0.4, Color3.FromHexString(COLORS.ether), 0.85);
    marker.position = new Vector3(VILLAGE_POSITION.x, VILLAGE_POSITION.y + 0.85, -0.4);
    marker.rotation.z = Math.PI / 4;
    return marker;
  }

  private update(delta: number) {
    this.elapsed += delta;
    const manualInput = this.input.consume();

    if (this.isDemo) {
      this.runDemo(delta);
    } else {
      this.player.move(manualInput.moveX, manualInput.moveY, delta, WORLD_BOUNDS);
      if (manualInput.attack) this.attack();
      if (manualInput.absorb) this.absorb();
    }

    this.player.update(delta);
    this.updateEssences(delta);
    this.updateEnemies(delta);
    this.updateQuest();
    this.animateQuestMarker();

    if (this.player.health <= 0) {
      this.player.restore();
      this.notice = "Sua forma se recompõe junto às raízes. Seja mais cauteloso.";
    }

    this.hudElapsed += delta;
    if (this.hudElapsed > 0.09) {
      this.hudElapsed = 0;
      this.emitHud();
    }
  }

  private updateEnemies(delta: number) {
    for (const enemy of this.enemies) {
      const damage = enemy.update(this.player, delta);
      if (damage > 0) {
        this.player.receiveDamage(damage);
        if (this.elapsed - this.lastHitNotice > 0.8) {
          this.notice = "Garras primordiais rasgam sua forma. Mantenha distância.";
          this.lastHitNotice = this.elapsed;
        }
      }
    }
  }

  private updateEssences(delta: number) {
    for (const essence of this.essences) {
      essence.phase += delta * 4;
      essence.mesh.position.y = essence.y + Math.sin(essence.phase) * 0.12;
      essence.mesh.scaling.x = 1 + Math.sin(essence.phase) * 0.12;
      essence.mesh.scaling.y = 1 + Math.sin(essence.phase) * 0.12;
      setDrawOrder(essence.mesh, essence.mesh.position.y, -0.45);
    }
  }

  private updateQuest() {
    if (this.stage === "clear" && this.enemies.every((enemy) => !enemy.alive)) {
      this.stage = "village";
      this.notice = "A clareira silenciou. Leve o Éter até a Vila de Musgo, a sudoeste.";
    }
    if (this.stage === "village" && this.distance(this.player.x, this.player.y, VILLAGE_POSITION.x, VILLAGE_POSITION.y) < 1.25) {
      this.stage = "complete";
      this.notice = "A Vila de Musgo aceita seu eco. Este é apenas o primeiro passo.";
    }
  }

  private animateQuestMarker() {
    const show = this.stage === "village";
    this.questMarker.isVisible = show;
    if (!show) return;
    const scale = 1 + Math.sin(this.elapsed * 3.1) * 0.18;
    this.questMarker.scaling.x = scale;
    this.questMarker.scaling.y = scale;
  }

  private attack() {
    if (!this.player.beginAttack()) return;
    const targets = this.enemies.filter((enemy) => enemy.alive && this.distance(this.player.x, this.player.y, enemy.x, enemy.y) < 1.65);
    if (targets.length === 0) {
      this.notice = "Seu golpe corta apenas a névoa. Aproxime-se de uma fera.";
      return;
    }
    for (const enemy of targets) {
      if (enemy.takeHit()) this.dropEssence(enemy.x, enemy.y);
    }
    this.notice = targets.some((enemy) => !enemy.alive) ? "Uma fera se dissolve em essência de Éter." : "O lobo recua, mas sua fome permanece.";
  }

  private dropEssence(x: number, y: number) {
    const mesh = MeshBuilder.CreatePlane(`ether-essence-${this.essences.length}`, { width: 0.42, height: 0.42 }, this.scene);
    const material = new StandardMaterial(`ether-essence-material-${this.essences.length}`, this.scene);
    material.emissiveColor = Color3.FromHexString(COLORS.ether);
    material.disableLighting = true;
    material.alpha = 0.96;
    mesh.material = material;
    mesh.position = new Vector3(x, y, -0.45);
    mesh.rotation.z = Math.PI / 4;
    this.essences.push({ mesh, x, y, phase: 0 });
  }

  private absorb() {
    const nearby = this.essences.find((essence) => this.distance(this.player.x, this.player.y, essence.mesh.position.x, essence.mesh.position.y) < 1.25);
    if (!nearby) {
      this.notice = "Nenhuma essência responde ao chamado. Derrote uma criatura e aproxime-se.";
      return;
    }
    nearby.mesh.dispose();
    this.essences.splice(this.essences.indexOf(nearby), 1);
    this.player.essence += 1;
    if (!this.player.traitUnlocked) {
      this.player.traitUnlocked = true;
      this.notice = "Evolução: Instinto Lupino desperto. Você sente as rotas da floresta.";
    } else {
      this.notice = "A essência se mistura à sua forma. O Éter aprende seu nome.";
    }
  }

  private runDemo(delta: number) {
    if (this.stage === "clear") {
      const target = this.enemies.find((enemy) => enemy.alive);
      if (!target) return;
      const distance = this.distance(this.player.x, this.player.y, target.x, target.y);
      if (distance > 1.2) this.player.move(target.x - this.player.x, target.y - this.player.y, delta, WORLD_BOUNDS);
      else this.attack();
      return;
    }
    if (this.essences.length > 0) {
      const essence = this.essences[0];
      const distance = this.distance(this.player.x, this.player.y, essence.mesh.position.x, essence.mesh.position.y);
      if (distance > 0.7) this.player.move(essence.mesh.position.x - this.player.x, essence.mesh.position.y - this.player.y, delta, WORLD_BOUNDS);
      else this.absorb();
      return;
    }
    if (this.stage === "village") this.player.move(VILLAGE_POSITION.x - this.player.x, VILLAGE_POSITION.y - this.player.y, delta, WORLD_BOUNDS);
  }

  private emitHud() {
    const defeated = this.enemies.filter((enemy) => !enemy.alive).length;
    this.onHudChange({
      health: Math.round(this.player.health),
      maxHealth: this.player.maxHealth,
      essence: this.player.essence,
      wolvesDefeated: defeated,
      wolvesTotal: this.enemies.length,
      quest: this.stage === "clear" ? "Expulse os lobos da clareira" : this.stage === "village" ? "Alcance a Vila de Musgo" : "A vila ainda respira",
      notice: this.notice,
      traitUnlocked: this.player.traitUnlocked,
      completed: this.stage === "complete",
    });
  }

  private distance(ax: number, ay: number, bx: number, by: number) {
    return Math.hypot(ax - bx, ay - by);
  }

  dispose() {
    this.input.dispose();
    this.scene.dispose();
  }
}
