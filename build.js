import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const ENTRY = 'game/main.js';
const SOURCE_DIRS = ['utils', 'engine', 'player', 'world', 'colossus', 'game'];

function getAllSourceFiles() {
  const files = new Map();
  for (const dir of SOURCE_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const f of fs.readdirSync(fullDir)) {
      if (f.endsWith('.js') && !f.endsWith('.test.js')) {
        const relPath = path.join(dir, f);
        files.set(relPath, fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
      }
    }
  }
  return files;
}

function resolveImport(fromFile, importPath) {
  let resolved = path.normalize(path.join(path.dirname(fromFile), importPath));
  if (fs.existsSync(path.join(ROOT, resolved))) return resolved;
  if (fs.existsSync(path.join(ROOT, resolved + '.js'))) return resolved + '.js';
  return resolved;
}

function parseFileExports(content) {
  const names = [];
  for (const m of content.matchAll(/export\s+function\s+(\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export\s+class\s+(\w+)/g)) names.push(m[1]);
  for (const m of content.matchAll(/export\s*\{([\s\S]*?)\}\s*;?\s*/g)) {
    for (const part of m[1].split(',')) {
      const trimmed = part.trim();
      const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) {
        names.push(asMatch[2]);
      } else if (trimmed && /^\w+$/.test(trimmed)) {
        names.push(trimmed);
      }
    }
  }
  return [...new Set(names)];
}

function parseFileExportsForIIFE(content) {
  const map = new Map();
  for (const m of content.matchAll(/export\s+function\s+(\w+)/g)) map.set(m[1], m[1]);
  for (const m of content.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) map.set(m[1], m[1]);
  for (const m of content.matchAll(/export\s+class\s+(\w+)/g)) map.set(m[1], m[1]);
  for (const m of content.matchAll(/export\s*\{([\s\S]*?)\}\s*;?\s*/g)) {
    for (const part of m[1].split(',')) {
      const trimmed = part.trim();
      const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) {
        map.set(asMatch[2], asMatch[1]);
      } else if (trimmed && /^\w+$/.test(trimmed)) {
        map.set(trimmed, trimmed);
      }
    }
  }
  return map;
}

function isLocalImport(source) {
  return source.startsWith('.') || source.startsWith('/');
}

function parseImports(content, fromFile) {
  const imports = [];
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const specifiers = match[1].trim();
    const source = match[2];
    if (isLocalImport(source)) {
      const resolved = resolveImport(fromFile, source);
      imports.push({ specifiers, source, resolved, isLocal: true, fullMatch: match[0] });
    } else {
      imports.push({ specifiers, source, resolved: source, isLocal: false, fullMatch: match[0] });
    }
  }
  return imports;
}

function topoSort(files) {
  const visited = new Set();
  const order = [];
  const visiting = new Set();

  function visit(relPath) {
    if (visited.has(relPath)) return;
    if (visiting.has(relPath)) return;
    visiting.add(relPath);

    const content = files.get(relPath);
    if (!content) return;

    const imports = parseImports(content, relPath);
    for (const imp of imports) {
      if (imp.isLocal && files.has(imp.resolved)) {
        visit(imp.resolved);
      }
    }

    visiting.delete(relPath);
    visited.add(relPath);
    order.push(relPath);
  }

  visit(ENTRY);
  for (const relPath of files.keys()) {
    visit(relPath);
  }
  return order;
}

function modVarName(relPath) {
  return '_m_' + relPath.replace(/[\/\\.-]/g, '_');
}

function build() {
  const files = getAllSourceFiles();
  const order = topoSort(files);

  console.log('Bundle order (' + order.length + ' files):');
  for (const f of order) {
    console.log('  ' + f);
  }

  const externalImports = new Set();
  const moduleNames = new Map();
  for (const relPath of order) {
    moduleNames.set(relPath, modVarName(relPath));
  }

  const moduleChunks = [];

  for (const relPath of order) {
    const content = files.get(relPath);
    const imports = parseImports(content, relPath);
    const exportMap = parseFileExportsForIIFE(content);
    const mv = moduleNames.get(relPath);
    const isEntry = relPath === ENTRY;

    let body = content;

    const sortedImports = [...imports].sort(
      (a, b) => content.indexOf(b.fullMatch) - content.indexOf(a.fullMatch)
    );

    const importStatements = [];
    for (const imp of sortedImports) {
      body = body.replace(imp.fullMatch, '');

      if (imp.isLocal) {
        const depModVar = moduleNames.get(imp.resolved);
        if (!depModVar) continue;

        const spec = imp.specifiers;
        if (spec.startsWith('* as ')) {
          const nsMatch = spec.match(/\*\s+as\s+(\w+)/);
          if (nsMatch) {
            importStatements.push(`const ${nsMatch[1]} = ${depModVar};`);
          }
        } else if (spec.startsWith('{')) {
          const innerMatch = spec.match(/\{([^}]*)\}/);
          if (innerMatch) {
            const parts = [];
            for (const part of innerMatch[1].split(',')) {
              const trimmed = part.trim();
              const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
              if (asMatch) {
                parts.push(`${asMatch[1]}: ${asMatch[2]}`);
              } else if (trimmed && /^\w+$/.test(trimmed)) {
                parts.push(trimmed);
              }
            }
            if (parts.length > 0) {
              importStatements.push(`const { ${parts.join(', ')} } = ${depModVar};`);
            }
          }
        }
      } else {
        if (!externalImports.has(imp.fullMatch.trim())) {
          externalImports.add(imp.fullMatch.trim());
        }
      }
    }

    body = body.replace(/export\s*\{[\s\S]*?\}\s*;?\s*/g, '');
    body = body.replace(/^export\s+default\s+/gm, '');
    body = body.replace(/^export\s+(async\s+)?/gm, '$1');

    const returnEntries = [...exportMap.entries()].map(([exported, internal]) => `${exported}: ${internal}`);

    let chunk;
    if (isEntry) {
      chunk = `(() => {\n${importStatements.join('\n')}\n${body}\n})();`;
    } else if (returnEntries.length > 0) {
      chunk = `const ${mv} = (() => {\n${importStatements.join('\n')}\n${body}\nreturn { ${returnEntries.join(', ')} };\n})();`;
    } else {
      chunk = `(() => {\n${importStatements.join('\n')}\n${body}\n})();`;
    }

    moduleChunks.push(chunk);
  }

  const externalImportBlock = [...externalImports].join('\n');
  const bundledJS = externalImportBlock + '\n\n' + moduleChunks.join('\n\n');

  const indexHTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const styleMatch = indexHTML.match(/<style>([\s\S]*?)<\/style>/);
  const style = styleMatch ? styleMatch[1] : '';

  const bodyMatch = indexHTML.match(/<body>([\s\S]*?)<script\s/m);
  const bodyContent = bodyMatch ? bodyMatch[1].trimEnd() : '';

  const output = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Polyshadow</title>
<style>
${style}
</style>
<script async src="https://ga.jspm.io/npm:es-module-shims@1.10.1/dist/es-module-shims.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "cannon-es": "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"
  }
}
</script>
</head>
<body>
${bodyContent}
<script type="module">
${bundledJS}
</script>
</body>
</html>`;

  const outPath = path.join(ROOT, 'polyshadow.html');
  fs.writeFileSync(outPath, output);
  const sizeKB = (output.length / 1024).toFixed(1);
  const jsSizeKB = (bundledJS.length / 1024).toFixed(1);
  console.log(`\nWrote ${outPath} (${sizeKB} KB total, ${jsSizeKB} KB JS)`);
}

build();
