import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildColossusVoxels } from './voxel-builder.js';
import { BlockType } from '../world/block-types.js';

describe('buildColossusVoxels', () => {
  it('returns data for sentinel type', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data);
    assert.ok(typeof data === 'object');
  });

  it('returns data for wraith type', () => {
    const data = buildColossusVoxels('wraith');
    assert.ok(data);
    assert.ok(typeof data === 'object');
  });

  it('returns data for titan type', () => {
    const data = buildColossusVoxels('titan');
    assert.ok(data);
    assert.ok(typeof data === 'object');
  });

  it('throws for unknown type', () => {
    assert.throws(() => buildColossusVoxels('unknown'));
  });
});

describe('sentinel voxels', () => {
  it('has 13 parts matching the definition', () => {
    const data = buildColossusVoxels('sentinel');
    const partIds = Object.keys(data);
    assert.equal(partIds.length, 13);
  });

  it('has a torso part with voxels', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.torso);
    assert.ok(data.torso.voxels.length > 0);
    assert.ok(data.torso.offset);
  });

  it('body parts use STONE blocks', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.torso.voxels.every(v => v.blockType === BlockType.STONE));
    assert.ok(data.hips.voxels.every(v => v.blockType === BlockType.STONE));
  });

  it('head weak point uses RUNE_GLOW', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.head);
    assert.ok(data.head.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('back rune weak points use RUNE_GLOW', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.back_rune_left);
    assert.ok(data.back_rune_left.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
    assert.ok(data.back_rune_right);
    assert.ok(data.back_rune_right.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('legs are present as body parts', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.front_left_upper);
    assert.ok(data.front_left_lower);
    assert.ok(data.front_right_upper);
    assert.ok(data.front_right_lower);
    assert.ok(data.back_left_upper);
    assert.ok(data.back_left_lower);
    assert.ok(data.back_right_upper);
    assert.ok(data.back_right_lower);
  });

  it('leg parts use STONE blocks', () => {
    const data = buildColossusVoxels('sentinel');
    const legIds = [
      'front_left_upper', 'front_left_lower', 'front_right_upper', 'front_right_lower',
      'back_left_upper', 'back_left_lower', 'back_right_upper', 'back_right_lower',
    ];
    for (const id of legIds) {
      assert.ok(data[id].voxels.length > 0, `${id} should have voxels`);
      assert.ok(data[id].voxels.every(v => v.blockType === BlockType.STONE), `${id} should be STONE`);
    }
  });

  it('part offsets match approximate positions from definition', () => {
    const data = buildColossusVoxels('sentinel');
    assert.ok(data.torso.offset);
    assert.equal(data.torso.offset.x, 0);
    assert.ok(data.torso.offset.y > 0, 'torso should be elevated');
  });
});

describe('wraith voxels', () => {
  it('has 9 parts matching the definition', () => {
    const data = buildColossusVoxels('wraith');
    const partIds = Object.keys(data);
    assert.equal(partIds.length, 9);
  });

  it('body segments use STONE blocks', () => {
    const data = buildColossusVoxels('wraith');
    const bodyParts = ['neck', 'chest', 'tail_base', 'tail_mid', 'tail_tip', 'head'];
    for (const id of bodyParts) {
      assert.ok(data[id], `should have ${id}`);
      assert.ok(data[id].voxels.length > 0, `${id} should have voxels`);
      assert.ok(data[id].voxels.every(v => v.blockType === BlockType.STONE), `${id} should be STONE`);
    }
  });

  it('wing weak points use RUNE_GLOW', () => {
    const data = buildColossusVoxels('wraith');
    assert.ok(data.left_wing);
    assert.ok(data.left_wing.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
    assert.ok(data.right_wing);
    assert.ok(data.right_wing.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('neck rune weak point uses RUNE_GLOW', () => {
    const data = buildColossusVoxels('wraith');
    assert.ok(data.neck_rune);
    assert.ok(data.neck_rune.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('has transparent flag on body parts', () => {
    const data = buildColossusVoxels('wraith');
    const bodyParts = ['neck', 'chest', 'tail_base', 'tail_mid', 'tail_tip', 'head'];
    for (const id of bodyParts) {
      assert.equal(data[id].transparent, true, `${id} should be transparent`);
    }
  });
});

describe('titan voxels', () => {
  it('has 16 parts matching the definition', () => {
    const data = buildColossusVoxels('titan');
    const partIds = Object.keys(data);
    assert.equal(partIds.length, 16);
  });

  it('shell parts use STONE blocks', () => {
    const data = buildColossusVoxels('titan');
    const shellParts = ['shell_main', 'shell_front', 'shell_rear', 'underbelly'];
    for (const id of shellParts) {
      assert.ok(data[id], `should have ${id}`);
      assert.ok(data[id].voxels.length > 0, `${id} should have voxels`);
      assert.ok(data[id].voxels.every(v => v.blockType === BlockType.STONE), `${id} should be STONE`);
    }
  });

  it('head weak point uses RUNE_GLOW', () => {
    const data = buildColossusVoxels('titan');
    assert.ok(data.head);
    assert.ok(data.head.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('shell rune weak points use RUNE_GLOW', () => {
    const data = buildColossusVoxels('titan');
    assert.ok(data.shell_rune_left);
    assert.ok(data.shell_rune_left.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
    assert.ok(data.shell_rune_right);
    assert.ok(data.shell_rune_right.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
    assert.ok(data.shell_rune_center);
    assert.ok(data.shell_rune_center.voxels.every(v => v.blockType === BlockType.RUNE_GLOW));
  });

  it('leg and claw parts are present with STONE blocks', () => {
    const data = buildColossusVoxels('titan');
    const limbParts = [
      'left_claw_upper', 'left_claw_lower',
      'right_claw_upper', 'right_claw_lower',
      'left_leg_front', 'left_leg_rear',
      'right_leg_front', 'right_leg_rear',
    ];
    for (const id of limbParts) {
      assert.ok(data[id], `should have ${id}`);
      assert.ok(data[id].voxels.length > 0, `${id} should have voxels`);
      assert.ok(data[id].voxels.every(v => v.blockType === BlockType.STONE), `${id} should be STONE`);
    }
  });

  it('part offsets match approximate positions', () => {
    const data = buildColossusVoxels('titan');
    assert.ok(data.shell_main.offset);
    assert.equal(data.shell_main.offset.x, 0);
    assert.ok(data.shell_main.offset.y > 0, 'shell should be elevated');
  });
});
