import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";

export function createImagePlane(name: string, scene: Scene, url: string, width: number, height: number) {
  const mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
  const material = new StandardMaterial(`${name}-material`, scene);
  const texture = new Texture(url, scene);
  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  material.disableLighting = true;
  material.backFaceCulling = false;
  mesh.material = material;
  return mesh;
}

export function createTintedPlane(name: string, scene: Scene, width: number, height: number, color: Color3, alpha = 1) {
  const mesh = MeshBuilder.CreatePlane(name, { width, height }, scene);
  const material = new StandardMaterial(`${name}-material`, scene);
  material.emissiveColor = color;
  material.disableLighting = true;
  material.alpha = alpha;
  material.backFaceCulling = false;
  mesh.material = material;
  return mesh;
}

export function setDrawOrder(mesh: Mesh, y: number, base = 0) {
  mesh.position.z = base - y * 0.012;
}
