import { Camera } from "@babylonjs/core/Cameras/camera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";
import type { GameHandle, HudSnapshot } from "./types";

export type { GameHandle } from "./types";

export async function createGameScene(
  engine: Engine,
  _canvas: HTMLCanvasElement,
  onHudChange: (snapshot: HudSnapshot) => void,
): Promise<GameHandle> {
  const scene = new Scene(engine);
  const camera = new FreeCamera("aetherion-camera", new Vector3(0, 0, -10), scene);
  camera.setTarget(Vector3.Zero());
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;

  const updateOrtho = () => {
    const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight());
    const halfHeight = 5.15;
    camera.orthoTop = halfHeight;
    camera.orthoBottom = -halfHeight;
    camera.orthoLeft = -halfHeight * aspect;
    camera.orthoRight = halfHeight * aspect;
  };
  updateOrtho();
  scene.onBeforeRenderObservable.add(updateOrtho);

  const world = new GameWorld(scene, new URLSearchParams(window.location.search).has("demo"), onHudChange);
  return { scene, dispose: () => world.dispose() };
}
