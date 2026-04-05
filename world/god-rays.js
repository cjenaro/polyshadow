import * as THREE from 'three';

const RAY_COUNT = 14;

const VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uPulseSpeed;
  uniform float uPulseFreq;
  varying vec2 vUv;

  void main() {
    float heightFade = pow(vUv.y, 1.5);
    float pulse = 0.7 + 0.3 * sin(uTime * uPulseSpeed + vUv.y * uPulseFreq);
    float alpha = heightFade * uOpacity * pulse;
    gl_FragColor = vec4(1.0, 0.88, 0.55, alpha);
  }
`;

export function createGodRaySystem(sunPos) {
  const rays = [];

  for (let i = 0; i < RAY_COUNT; i++) {
    const angle = (i / RAY_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const length = 100 + Math.random() * 80;
    const topRadius = 0.5 + Math.random() * 1.5;
    const bottomRadius = 12 + Math.random() * 20;

    const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, length, 6, 1, true);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: Math.random() * 10 },
        uOpacity: { value: 0.015 + Math.random() * 0.025 },
        uPulseSpeed: { value: 0.2 + Math.random() * 0.4 },
        uPulseFreq: { value: 2.0 + Math.random() * 3.0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const tiltAmount = 0.15 + Math.random() * 0.3;

    mesh.position.set(
      sunPos.x + Math.cos(angle) * tiltAmount * 30,
      sunPos.y - length * 0.4,
      sunPos.z + Math.sin(angle) * tiltAmount * 30
    );
    mesh.rotation.x = Math.cos(angle) * tiltAmount;
    mesh.rotation.z = -Math.sin(angle) * tiltAmount;

    rays.push(mesh);
  }

  return {
    rays,
    update(dt) {
      for (const ray of rays) {
        ray.material.uniforms.uTime.value += dt;
      }
    },
  };
}
