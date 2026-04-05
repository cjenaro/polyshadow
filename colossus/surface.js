export function getPatchesPerPart(patches) {
  const grouped = new Map();
  for (const patch of patches) {
    const id = patch.bodyPartId;
    if (!grouped.has(id)) {
      grouped.set(id, []);
    }
    grouped.get(id).push(patch);
  }
  return grouped;
}

export function getPatchCoverageStats(patches, definition) {
  const patchesPerPart = getPatchesPerPart(patches);

  let minPatches = Infinity;
  let maxPatches = 0;
  for (const [, partPatches] of patchesPerPart) {
    const count = partPatches.length;
    if (count < minPatches) minPatches = count;
    if (count > maxPatches) maxPatches = count;
  }

  const climbablePartIds = definition.parts.filter((p) => p.isClimbable).map((p) => p.id);

  const climbablePartsMissingPatches = [];
  for (const id of climbablePartIds) {
    if (!patchesPerPart.has(id) || patchesPerPart.get(id).length === 0) {
      climbablePartsMissingPatches.push(id);
    }
  }

  return {
    totalPatches: patches.length,
    partsWithPatches: patchesPerPart.size,
    patchesPerPart,
    minPatchesPerPart: patchesPerPart.size > 0 ? minPatches : 0,
    maxPatchesPerPart: patchesPerPart.size > 0 ? maxPatches : 0,
    climbablePartsMissingPatches,
  };
}

export function validateSurfacePatches(patches, definition) {
  const stats = getPatchCoverageStats(patches, definition);
  const patchPartIds = patches.map((p) => p.bodyPartId);

  return {
    valid: stats.climbablePartsMissingPatches.length === 0,
    totalPatches: stats.totalPatches,
    missingParts: stats.climbablePartsMissingPatches,
    patchPartIds,
    patchesPerPart: stats.patchesPerPart,
    partsWithPatches: stats.partsWithPatches,
  };
}
