import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;

const VOXEL_FILES = [
  "world/voxel-chunk.js",
  "world/voxel-mesher.js",
  "world/voxel-storage.js",
  "world/block-types.js",
  "world/voxel-chunk-manager.js",
  "world/voxel-island-generator.js",
  "world/voxel-materials.js",
  "world/voxel-physics.js",
  "world/voxel-atmosphere.js",
  "world/voxel-lod.js",
  "world/voxel-audio.js",
  "world/voxel-indicators.js",
  "colossus/voxel-templates.js",
  "colossus/voxel-builder.js",
  "colossus/voxel-effects.js",
  "player/voxel-character-mesh.js",
];

const IMPORT_RE = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*/g;

describe("build.test.js", () => {
  test("all voxel source files exist", () => {
    for (const rel of VOXEL_FILES) {
      const fullPath = path.join(ROOT, rel);
      assert.ok(fs.existsSync(fullPath), `Missing: ${rel}`);
    }
  });

  test("all voxel files are parseable (valid imports)", () => {
    for (const rel of VOXEL_FILES) {
      const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
      let match;
      while ((match = IMPORT_RE.exec(content)) !== null) {
        const source = match[2];
        if (source.startsWith(".") || source.startsWith("/")) {
          const resolved = path.normalize(path.join(path.dirname(rel), source));
          const tryPaths = [path.join(ROOT, resolved), path.join(ROOT, resolved + ".js")];
          const found = tryPaths.some((p) => fs.existsSync(p));
          assert.ok(found, `${rel}: cannot resolve import "${source}" -> ${resolved}`);
        }
      }
    }
  });

  test("voxel logic files have no three.js imports", () => {
    for (const rel of VOXEL_FILES) {
      const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const hasThree = /from\s+['"]three(?:\/|['"])/.test(content);
      assert.ok(!hasThree, `${rel}: must not import three.js (use pure JS)`);
    }
  });

  test("build output includes all voxel files", () => {
    const htmlPath = path.join(ROOT, "polyshadow.html");
    assert.ok(fs.existsSync(htmlPath), "polyshadow.html missing — run node build.js first");
    const html = fs.readFileSync(htmlPath, "utf8");
    for (const rel of VOXEL_FILES) {
      const marker = rel.replace(/[/\\.-]/g, "_");
      assert.ok(html.includes(marker), `polyshadow.html missing module for ${rel}`);
    }
  });

  test("topoSort includes all source files, not just reachable ones", () => {
    const SOURCE_DIRS = ["utils", "engine", "player", "world", "colossus", "game"];
    let totalFiles = 0;
    for (const dir of SOURCE_DIRS) {
      const fullDir = path.join(ROOT, dir);
      if (!fs.existsSync(fullDir)) continue;
      for (const f of fs.readdirSync(fullDir)) {
        if (f.endsWith(".js") && !f.endsWith(".test.js")) totalFiles++;
      }
    }
    const html = fs.readFileSync(path.join(ROOT, "polyshadow.html"), "utf8");

    const iifeCount = (html.match(/\(\(\) => \{/g) || []).length;
    assert.ok(
      iifeCount >= totalFiles,
      `Expected at least ${totalFiles} IIFE blocks, got ${iifeCount}`,
    );
  });

  test("build output has no new CDN dependencies beyond three", () => {
    const html = fs.readFileSync(path.join(ROOT, "polyshadow.html"), "utf8");
    const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, "No module script found in polyshadow.html");
    const js = scriptMatch[1];
    const cdnImports = [...js.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((m) => m[1])
      .filter((s) => s.startsWith("http"));
    for (const url of cdnImports) {
      assert.ok(
        url.includes("three") || url.includes("es-module-shims"),
        `Unexpected CDN dependency: ${url}`,
      );
    }
  });
});
