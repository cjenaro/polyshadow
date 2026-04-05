import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIsland,
  generateIslandGeometry,
  getIslandSurfaceHeight,
  isOnIsland,
  findSpawnPoint,
  createHubIsland,
  createArenaIsland,
  generateArenaTerrain,
  generateRuinPositions,
  getArenaSpawnPoint,
  getColossusSpawnPoint,
  getArenaBounds,
} from './island.js';

describe('createIsland', () => {
  it('creates island with correct properties', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.equal(island.center.x, 0);
    assert.equal(island.center.z, 0);
    assert.equal(island.radius, 50);
    assert.equal(island.maxHeight, 10);
    assert.equal(island.seed, 42);
    assert.equal(island.type, 'hub');
    assert.equal(island.generated, false);
  });

  it('supports arena type', () => {
    const island = createIsland({
      center: { x: 100, z: 200 },
      radius: 80,
      maxHeight: 15,
      seed: 7,
      type: 'arena'
    });
    assert.equal(island.type, 'arena');
    assert.equal(island.center.x, 100);
    assert.equal(island.center.z, 200);
  });

  it('supports traversal type', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 30,
      maxHeight: 8,
      seed: 1,
      type: 'traversal'
    });
    assert.equal(island.type, 'traversal');
  });

  it('creates independent islands', () => {
    const a = createIsland({ center: { x: 0, z: 0 }, radius: 10, maxHeight: 5, seed: 1, type: 'hub' });
    const b = createIsland({ center: { x: 100, z: 100 }, radius: 20, maxHeight: 8, seed: 2, type: 'arena' });
    assert.notEqual(a.center.x, b.center.x);
    assert.notEqual(a.radius, b.radius);
  });
});

describe('generateIslandGeometry', () => {
  it('populates island with heightmap data', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    const generated = generateIslandGeometry(island);
    assert.equal(generated.generated, true);
    assert.ok(generated.heightData instanceof Float32Array);
    assert.equal(generated.resolution, 64);
    assert.ok(generated.resolution * generated.resolution <= generated.heightData.length);
  });

  it('does not mutate original island', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.equal(island.generated, false);
    generateIslandGeometry(island);
    assert.equal(island.generated, false);
  });

  it('center height is higher than edge height', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    const generated = generateIslandGeometry(island);
    const centerH = getIslandSurfaceHeight(generated, 0, 0);
    const edgeH = getIslandSurfaceHeight(generated, 45, 0);
    assert.ok(centerH > edgeH, `center ${centerH} should be > edge ${edgeH}`);
  });

  it('is deterministic with same seed', () => {
    const make = () => {
      const island = createIsland({
        center: { x: 0, z: 0 },
        radius: 32,
        maxHeight: 10,
        seed: 99,
        type: 'hub'
      });
      return generateIslandGeometry(island);
    };
    const a = make();
    const b = make();
    assert.equal(a.heightData.length, b.heightData.length);
    for (let i = 0; i < a.heightData.length; i++) {
      assert.equal(a.heightData[i], b.heightData[i]);
    }
  });
});

describe('getIslandSurfaceHeight', () => {
  it('returns center height at center position', () => {
    const island = createHubIsland();
    const gen = generateIslandGeometry(island);
    const h = getIslandSurfaceHeight(gen, 0, 0);
    assert.ok(typeof h === 'number');
    assert.ok(h >= 0);
  });

  it('returns 0 outside island bounds', () => {
    const island = createHubIsland();
    const gen = generateIslandGeometry(island);
    const h = getIslandSurfaceHeight(gen, 999, 999);
    assert.equal(h, 0);
  });

  it('height decreases toward edge', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    const gen = generateIslandGeometry(island);
    const hCenter = getIslandSurfaceHeight(gen, 0, 0);
    const hMid = getIslandSurfaceHeight(gen, 20, 0);
    assert.ok(hCenter >= hMid, `center ${hCenter} should be >= mid ${hMid}`);
  });


});

describe('isOnIsland', () => {
  it('returns true at island center', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.ok(isOnIsland(island, 0, 0));
  });

  it('returns true within radius', () => {
    const island = createIsland({
      center: { x: 100, z: 200 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.ok(isOnIsland(island, 120, 210));
  });

  it('returns false outside radius', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.ok(!isOnIsland(island, 60, 0));
  });

  it('returns false at exact edge', () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    assert.ok(!isOnIsland(island, 50, 0));
  });


});

describe('findSpawnPoint', () => {
  it('returns position within island bounds', () => {
    const island = createHubIsland();
    const spawn = findSpawnPoint(island);
    assert.ok(isOnIsland(island, spawn.x, spawn.z));
  });

  it('spawn is near center of island', () => {
    const island = createIsland({
      center: { x: 100, z: 200 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: 'hub'
    });
    const spawn = findSpawnPoint(island);
    assert.ok(typeof spawn.x === 'number');
    assert.ok(typeof spawn.z === 'number');
    const dx = spawn.x - 100;
    const dz = spawn.z - 200;
    const dist = Math.sqrt(dx * dx + dz * dz);
    assert.ok(dist < 10, `spawn distance ${dist} should be < 10 from center`);
  });

  it('spawn has y=0 before geometry generation', () => {
    const island = createHubIsland();
    const spawn = findSpawnPoint(island);
    assert.equal(spawn.y, 0);
  });
});

describe('createHubIsland', () => {
  it('creates island with hub type', () => {
    const island = createHubIsland();
    assert.equal(island.type, 'hub');
  });

  it('has safe zone flag', () => {
    const island = createHubIsland();
    assert.equal(island.safeZone, true);
  });

  it('has shrine position', () => {
    const island = createHubIsland();
    assert.ok(typeof island.shrine === 'object');
    assert.ok(typeof island.shrine.x === 'number');
    assert.ok(typeof island.shrine.z === 'number');
  });

  it('shrine is at island center', () => {
    const island = createHubIsland();
    assert.equal(island.shrine.x, island.center.x);
    assert.equal(island.shrine.z, island.center.z);
  });
});

describe('createArenaIsland', () => {
  it('creates island with arena type', () => {
    const arena = createArenaIsland('minotaur');
    assert.equal(arena.type, 'arena');
  });

  it('stores colossus type', () => {
    const arena = createArenaIsland('minotaur');
    assert.equal(arena.colossusType, 'minotaur');
  });

  it('is not a safe zone', () => {
    const arena = createArenaIsland('minotaur');
    assert.equal(arena.safeZone, false);
  });

  it('has spawn point near edge (player arrives from traversal)', () => {
    const arena = createArenaIsland('minotaur');
    const spawn = findSpawnPoint(arena);
    const dx = spawn.x - arena.center.x;
    const dz = spawn.z - arena.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    assert.ok(dist > 5, `arena spawn should be away from center, got dist=${dist}`);
  });
});

describe('generateArenaTerrain', () => {
  it('returns heightmap with correct size', () => {
    const arena = createArenaIsland('sentinel');
    const terrain = generateArenaTerrain(arena);
    assert.strictEqual(terrain.resolution, 128);
    assert.strictEqual(terrain.heights.length, 128 * 128);
  });

  it('heights are zero at island edges', () => {
    const arena = createArenaIsland('sentinel');
    const terrain = generateArenaTerrain(arena);
    const cornerH = terrain.heights[0];
    assert.ok(cornerH < 0.01, `corner height should be near zero, got ${cornerH}`);
  });

  it('heights are positive near center', () => {
    const arena = createArenaIsland('sentinel');
    const terrain = generateArenaTerrain(arena);
    const res = terrain.resolution;
    const center = Math.floor(res / 2);
    const centerH = terrain.heights[center * res + center];
    assert.ok(centerH > 0, `center height should be positive, got ${centerH}`);
  });

  it('stores reference to arena', () => {
    const arena = createArenaIsland('sentinel');
    const terrain = generateArenaTerrain(arena);
    assert.strictEqual(terrain.arena, arena);
  });
});

describe('generateRuinPositions', () => {
  it('returns requested number of ruins', () => {
    const arena = createArenaIsland('sentinel');
    const ruins = generateRuinPositions(arena, 5);
    assert.strictEqual(ruins.length, 5);
  });

  it('each ruin has x, z, scale and type', () => {
    const arena = createArenaIsland('sentinel');
    const ruins = generateRuinPositions(arena, 3);
    for (const ruin of ruins) {
      assert.ok(typeof ruin.x === 'number', 'ruin.x should be a number');
      assert.ok(typeof ruin.z === 'number', 'ruin.z should be a number');
      assert.ok(typeof ruin.scale === 'number', 'ruin.scale should be a number');
      assert.ok(typeof ruin.type === 'string', 'ruin.type should be a string');
      assert.ok(ruin.scale > 0, 'ruin.scale should be positive');
    }
  });

  it('ruins are within arena radius', () => {
    const arena = createArenaIsland('sentinel');
    const ruins = generateRuinPositions(arena, 10);
    for (const ruin of ruins) {
      const dist = Math.sqrt(ruin.x ** 2 + ruin.z ** 2);
      assert.ok(dist < arena.radius, `ruin at dist ${dist} exceeds radius ${arena.radius}`);
    }
  });

  it('ruins do not overlap (minimum distance)', () => {
    const arena = createArenaIsland('sentinel');
    const ruins = generateRuinPositions(arena, 8);
    for (let i = 0; i < ruins.length; i++) {
      for (let j = i + 1; j < ruins.length; j++) {
        const dx = ruins[i].x - ruins[j].x;
        const dz = ruins[i].z - ruins[j].z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        assert.ok(dist >= 5, `ruins ${i} and ${j} are too close: ${dist}`);
      }
    }
  });

  it('is deterministic with same seed', () => {
    const arena1 = createArenaIsland('sentinel');
    const arena2 = createArenaIsland('sentinel');
    const r1 = generateRuinPositions(arena1, 5);
    const r2 = generateRuinPositions(arena2, 5);
    assert.strictEqual(r1.length, r2.length);
    for (let i = 0; i < r1.length; i++) {
      assert.strictEqual(r1[i].x, r2[i].x);
      assert.strictEqual(r1[i].z, r2[i].z);
    }
  });
});

describe('getArenaSpawnPoint', () => {
  it('returns a point on arena edge', () => {
    const arena = createArenaIsland('sentinel');
    const spawn = getArenaSpawnPoint(arena);
    const dist = Math.sqrt(spawn.x ** 2 + spawn.z ** 2);
    assert.ok(dist > arena.radius * 0.8, `spawn dist ${dist} too close to center`);
    assert.ok(dist < arena.radius, `spawn dist ${dist} outside arena`);
    assert.ok(typeof spawn.y === 'number');
  });

  it('spawns far from colossus spawn', () => {
    const arena = createArenaIsland('sentinel');
    const playerSpawn = getArenaSpawnPoint(arena);
    const colSpawn = getColossusSpawnPoint(arena);
    const dx = playerSpawn.x - colSpawn.x;
    const dz = playerSpawn.z - colSpawn.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    assert.ok(dist > 20, `player and colossus spawns too close: ${dist}`);
  });

  it('includes y position', () => {
    const arena = createArenaIsland('sentinel');
    const spawn = getArenaSpawnPoint(arena);
    assert.ok(typeof spawn.y === 'number');
  });
});

describe('getColossusSpawnPoint', () => {
  it('returns a point near arena center', () => {
    const arena = createArenaIsland('sentinel');
    const spawn = getColossusSpawnPoint(arena);
    const dist = Math.sqrt(spawn.x ** 2 + spawn.z ** 2);
    assert.ok(dist < arena.radius * 0.5, `colossus spawn too far from center: ${dist}`);
    assert.ok(typeof spawn.y === 'number');
  });
});

describe('getArenaBounds', () => {
  it('returns min and max bounds based on arena', () => {
    const arena = createArenaIsland('sentinel');
    const bounds = getArenaBounds(arena);
    assert.ok(bounds.min.x <= 0 - arena.radius, `min.x too high: ${bounds.min.x}`);
    assert.ok(bounds.max.x >= 0 + arena.radius, `max.x too low: ${bounds.max.x}`);
    assert.ok(bounds.min.z <= 0 - arena.radius, `min.z too high: ${bounds.min.z}`);
    assert.ok(bounds.max.z >= 0 + arena.radius, `max.z too low: ${bounds.max.z}`);
  });

  it('bounds are square for circular arena', () => {
    const arena = createArenaIsland('sentinel');
    const bounds = getArenaBounds(arena);
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    assert.strictEqual(width, depth);
  });

  it('y bounds are 0 at bottom', () => {
    const arena = createArenaIsland('sentinel');
    const bounds = getArenaBounds(arena);
    assert.strictEqual(bounds.min.y, 0);
    assert.ok(bounds.max.y > 0);
  });
});
