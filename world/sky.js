import {
  createMesh,
  createColor,
  lerpColors,
  createDirectionalLight,
  createAmbientLight,
  createHemisphereLight,
} from "../engine/renderer.js";

const GOLD_BOTTOM = createColor(0.831, 0.627, 0.09);
const PEACH_MID = createColor(0.961, 0.796, 0.655);
const BLUE_TOP = createColor(0.529, 0.808, 0.922);

export function createSky(scene) {
  const skyDome = createMesh({
    radius: 400,
    widthSegments: 32,
    heightSegments: 32,
    vertexColors: true,
    side: 1,
    fog: false,
  });
  const posAttr = skyDome.getPositionAttribute();
  const colors = [];

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const t = (y + 400) / 800;
    const c =
      t < 0.4
        ? lerpColors(GOLD_BOTTOM, PEACH_MID, t / 0.4)
        : lerpColors(PEACH_MID, BLUE_TOP, (t - 0.4) / 0.6);
    colors.push(c.r, c.g, c.b);
  }
  skyDome.setVertexColors(colors);
  scene.add(skyDome);

  const sun = createDirectionalLight(0xffd700, 1.2);
  sun.setPosition(50, 20, 30);
  sun.setCastShadow(true);
  sun.setShadowMapSize(2048, 2048);
  sun.configureShadowCamera({ near: 0.5, far: 200, left: -50, right: 50, top: 50, bottom: -50 });
  scene.add(sun);

  const ambient = createAmbientLight(0xfff8dc, 0.4);
  scene.add(ambient);

  const hemisphere = createHemisphereLight(0x87ceeb, 0x8b7355, 0.3);
  scene.add(hemisphere);

  scene.setFog(0xc9a84c, 0.005);

  return { sun, ambient, hemisphere, skyDome, update() {} };
}
