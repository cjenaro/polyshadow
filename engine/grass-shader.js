import * as THREE from "three";
import { noise2D } from "../utils/noise.js";

export function createGrassShaderMaterial(island) {
  const resolution = island.resolution;
  const noiseScale = 0.15;
  const detailScale = 0.4;
  const seed = island.seed || 42;

  const noiseData = new Float32Array((resolution + 1) * (resolution + 1) * 3);

  for (let i = 0; i < (resolution + 1) * (resolution + 1); i++) {
    const x = (i % (resolution + 1)) / resolution;
    const y = Math.floor(i / (resolution + 1)) / resolution;
    const nx = x * noiseScale * 10;
    const ny = y * noiseScale * 10;
    const detailX = x * detailScale * 30;
    const detailY = y * detailScale * 30;
    const n = noise2D(nx + seed, ny + seed) * 0.5 + 0.5;
    const detail = noise2D(detailX + seed * 2, detailY + seed * 2) * 0.3;
    noiseData[i * 3] = n;
    noiseData[i * 3 + 1] = detail;
    noiseData[i * 3 + 2] = 0;
  }

  const noiseTexture = new THREE.DataTexture(
    noiseData,
    resolution + 1,
    resolution + 1,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  noiseTexture.needsUpdate = true;

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying float vHeight;
    varying vec3 vWorldPos;
    
    attribute vec3 color;
    
    void main() {
      vUv = uv;
      vColor = color;
      vNormal = normalize(normalMatrix * normal);
      vHeight = position.y;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D noiseTexture;
    uniform float maxHeight;
    uniform vec3 lightDir;
    
    varying vec2 vUv;
    varying vec3 vColor;
    varying vec3 vNormal;
    varying float vHeight;
    varying vec3 vWorldPos;
    
    vec3 darkenColor(vec3 color, float amount) {
      return color * (1.0 - amount);
    }
    
    vec3 lightenColor(vec3 color, float amount) {
      return color + (vec3(1.0) - color) * amount;
    }
    
    void main() {
      vec4 noise = texture2D(noiseTexture, vUv);
      float variation = noise.r * 0.4 - 0.2;
      float detail = noise.g * 0.2;
      
      float grassThreshold = maxHeight * 0.2;
      float stoneThreshold = maxHeight * 0.7;
      
      vec3 finalColor = vColor;
      
      if (vHeight < grassThreshold) {
        float t = clamp(vHeight / grassThreshold, 0.0, 1.0);
        vec3 dirtColor = vec3(0.28, 0.19, 0.08);
        vec3 grassColor = vec3(0.18, 0.42, 0.1);
        vec3 grassDark = vec3(0.12, 0.28, 0.06);
        
        float grassMix = smoothstep(0.3, 0.8, t);
        vec3 baseGrass = mix(grassDark, grassColor, grassMix);
        baseGrass += variation;
        baseGrass = clamp(baseGrass, 0.0, 1.0);
        
        float grassDetail = 1.0 + detail;
        finalColor = mix(dirtColor, baseGrass * grassDetail, t);
        
        float bladePattern = sin(vWorldPos.x * 8.0 + vWorldPos.z * 12.0) * 0.5 + 0.5;
        float bladeIntensity = smoothstep(0.4, 0.6, t) * bladePattern * 0.15;
        finalColor = lightenColor(finalColor, bladeIntensity);
        
      } else if (vHeight < stoneThreshold) {
        float t = (vHeight - grassThreshold) / (stoneThreshold - grassThreshold);
        vec3 grassColor = vec3(0.18, 0.42, 0.1);
        vec3 stoneColor = vec3(0.45, 0.42, 0.38);
        
        vec3 stoneVariation = stoneColor + variation * 0.3;
        finalColor = mix(grassColor, stoneVariation, t);
        
        float mossAmount = (1.0 - t) * smoothstep(0.4, 0.6, detail + 0.5);
        vec3 mossColor = vec3(0.25, 0.35, 0.15);
        finalColor = mix(finalColor, mossColor, mossAmount * 0.4);
        
      } else {
        float t = min(1.0, (vHeight - stoneThreshold) / (maxHeight - stoneThreshold));
        vec3 stoneColor = vec3(0.45, 0.42, 0.38);
        vec3 snowColor = vec3(0.85, 0.88, 0.92);
        
        vec3 stoneVariation = stoneColor + variation * 0.2;
        finalColor = mix(stoneVariation, snowColor, t * 0.7);
        
        float snowPatches = smoothstep(0.6, 0.8, detail + 0.5);
        finalColor = mix(finalColor, snowColor, snowPatches * t);
      }
      
      float diff = max(dot(vNormal, lightDir), 0.0);
      float ambient = 0.4;
      float lighting = ambient + diff * 0.6;
      
      finalColor *= lighting;
      
      float ao = smoothstep(0.0, grassThreshold * 0.5, vHeight) * 0.3 + 0.7;
      finalColor *= ao;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      noiseTexture: { value: noiseTexture },
      maxHeight: { value: island.maxHeight },
      lightDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
    },
    vertexShader,
    fragmentShader,
    vertexColors: true,
  });

  return material;
}