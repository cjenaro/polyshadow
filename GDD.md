# Polyshadow - Game Design Document

## Overview

**Title:** Polyshadow
**Tagline:** *"Ascend the sky. Defeat the giants. Feel the vibe."*
**Genre:** 3D Action-Adventure / Exploration
**Inspiration:** Shadow of the Colossus, Journey
**Engine:** Three.js (ES Modules, no build tools)
**Platform:** Web browser (desktop + mobile)
**Jam:** Vibe Jam
**Delivery:** Single HTML file, zero build step, instant load

---

## Core Experience

A lone caped wanderer traverses floating sky islands to find and defeat colossal guardians. The game emphasizes **scale, atmosphere, and the physicality of climbing** massive creatures. Golden-hour lighting, procedural audio, and minimal UI let the world speak.

---

## Technical Constraints

- Single HTML file (or minimal HTML + JS files)
- No build tools (Vite, Webpack, etc.)
- Three.js via CDN (es-module-shims for bare imports)
- Must load near-instantly (< 3s on 4G)
- All geometry procedurally generated (no model files)
- Procedural audio via Web Audio API
- Input abstraction layer: Keyboard+Mouse, Gamepad, Mobile Touch Overlay
- Responsive canvas, works on mobile screens

---

## Player Character

- **Low-poly humanoid** with a flowing cape (cloth sim via simple spring chain)
- Third-person camera with smooth orbit
- Moveset:
  - Walk/Run (sprint with stamina drain)
  - Jump (context-sensitive: ground jump, wall leap)
  - Grab (attach to climbable surfaces)
  - Climb (movement on vertical surfaces, stamina management)
  - Attack (sword slash when on colossus weak points)
  - Roll/Dodge (i-frames, stamina cost)

### Stamina System
- Climbing and sprinting drain stamina
- Stamina regenerates when standing on ground / resting grip
- Running out of stamina while climbing = fall
- Visual indicator: vignette pulse + cape stops flowing

---

## Camera System

- Third-person orbit camera
- Auto-adjusts distance based on context (close for climbing, far for exploration)
- Collision avoidance (doesn't clip through geometry)
- Look-at target shifts based on activity (player center, colossus weak point, etc.)

---

## World Design

### Theme: Sky World, Golden Hour
- **Color palette:**
  - Sky: warm gradient (deep gold → soft peach → pale blue at zenith)
  - Islands: warm grey stone, golden grass patches, white crystalline accents
  - Colossi: earthy tones with glowing weak points (warm amber)
  - Fog layers between islands for depth and atmosphere
- **Lighting:** Directional "sun" at low angle, ambient warm fill, subtle god rays (post-process or particle)
- **Atmosphere:**
  - Volumetric-ish fog between island layers
  - Floating dust/pollen particles
  - Wind visualized by particles and cape movement
  - Distant colossi visible as silhouettes

### Level Structure: Open Traversal
The world is a vertical sky space with floating islands at different heights.

**Hub Island (Start)**
- Small starting platform with a shrine/monument
- Directions to each colossus indicated by light pillars or wind streams
- Safe zone, no enemies

**Traversal**
- Islands connected by natural-looking paths (narrow bridges, stepping stones, floating debris)
- Wind currents the player can "ride" (gliding segments)
- Hidden paths for secrets
- Open feel - player can choose colossus order

**Arena Islands (3 colossi)**
- Larger islands serving as boss arenas
- Unique terrain per colossus (ruins, crags, water pools)
- Environmental hazards or climbing aids

---

## Colossi Design

Each colossus has:
- **Climbable body** with procedurally generated geometry
- **Weak points** (glowing sigils) that must be stabbed
- **Behavior states:** Idle, Patrol, Aggro, Stunned, Dying
- **Shake-off mechanic:** periodically tries to throw player off
- **Unique movement pattern**

### Colossus 1: The Stone Sentinel (Land)
- **Type:** Quadruped, golem-like
- **Location:** First island (lowest), easiest path
- **Size:** ~20x player height
- **Behavior:** Slow patrol, charges when player is spotted
- **Climbing:** Standard climb, relatively stable
- **Weak points:** 2 on back, 1 on head (must climb from back)
- **Arena:** Rocky island with ruins for cover
- **Difficulty:** Easy - tutorial colossus

### Colossus 2: The Wind Wraith (Air)
- **Type:** Serpentine/dragon-like flying creature
- **Location:** Second island (mid-height), accessed via wind current bridge
- **Size:** ~30x player length
- **Behavior:** Flies in patterns, swoops down to attack
- **Climbing:** Must jump onto it from elevated platforms when it swoops, constantly moving, wind pushes player
- **Weak points:** 2 on wings (each wing), 1 on neck
- **Arena:** Open sky with small floating platforms to jump from
- **Difficulty:** Medium - timing and precision

### Colossus 3: The Tide Titan (Water/Sky)
- **Type:** Massive turtle-crab hybrid floating on a cloud-sea
- **Location:** Highest island, most dangerous traversal
- **Size:** ~40x player width
- **Behavior:** Slow but devastating, creates shockwaves, submerges parts of arena
- **Climbing:** Unstable surface, tilting shell, water hazards
- **Weak points:** 3 on shell (must navigate shell terrain), 1 on head (only exposed when stunned)
- **Arena:** Cloud-covered island with pools that rise and fall
- **Difficulty:** Hard - multi-phase fight

---

## Combat System

- **No health bar for player** (one-hit stagger from big attacks, ~3 hits from small)
- **No lock-on** (deliberate - player must aim manually)
- **Sword attack:** Quick slash, deals damage to weak points only
- **Stab:** Charged attack while climbing (hold button, plunges sword)
- **Stun mechanic:** Certain actions or environmental elements can stun a colossus, exposing weak points or creating climbing opportunities
- **Damage feedback:** Camera shake, particle burst, colossus reaction animation

---

## Climbing System

Core mechanic. Must feel physical and tense.

- **Grab:** Press grab near a climbable surface → attach
- **Climb:** Move while grabbed (stamina drains)
- **Jump-climb:** Leap between grab points or surfaces
- **Shake-off:** Colossus periodically vibrates/shakes → player must hold grab (extra stamina drain) or get flung
- **Rest spots:** Flat areas on colossus where stamina regenerates
- **Fall:** Running out of stamina or being shaken off → freefall with camera drama

### Collision for Climbing
- Colossus body represented as a combination of:
  - Convex shapes for broad collision
  - Surface patches for grab points
  - Weak point triggers (glowing areas)
- Player snaps to surface normal when grabbing
- Movement relative to surface orientation

---

## Progression & Win State

- **Non-linear:** Player chooses colossus order (though 1→2→3 is suggested by difficulty)
- **After defeating all 3 colossi:**
  - The sky opens up - clouds part revealing a cosmic vista
  - The islands slowly rise, converging
  - A final silent scene plays (no UI, just camera and world)
  - The wanderer stands at the convergence point, cape flowing in the cosmic wind
  - Title card fades in
  - Credits roll as player can still move around the transformed world
- **No game over screen** - falling from height respawns at nearest island edge

---

## UI / HUD

**Minimal by design:**
- **Stamina bar:** Thin arc around player (subtle, color fades from white → red)
- **Colossus health:** Shown as fading opacity of the colossus itself (no bar)
- **No health bar for player**
- **Direction hints:** Faint light pillars or wind particle streams pointing to next objective
- **Title screen:** Game title on a blurred golden sky, "Press any key" → instant gameplay start
- **No pause menu** (maybe a simple resume/quit overlay)
- **Victory screen:** Brief text card + credits

---

## Audio Design (Procedural)

All audio generated via Web Audio API:

- **Ambient wind:** Filtered noise with slow LFO modulation
- **Footsteps:** Short noise bursts with bandpass filter, pitch varies by surface
- **Climbing:** Rhythmic grab sounds (short filtered clicks)
- **Stamina low:** Heartbeat-like pulse (filtered sine wave)
- **Sword slash:** Short noise burst with fast decay, metallic resonance
- **Colossus impact:** Low-frequency boom with distortion
- **Colossus weak point hit:** Resonant "ding" with reverb tail
- **Colossus death:** Long evolving drone that fades with the colossus
- **Music:** Layered ambient pads
  - Base layer: Always playing, warm drone
  - Exploration layer: Adds when roaming
  - Combat layer: Adds rhythmic pulse + tension when near/attacking colossus
  - Victory layer: Ascending harmony after final kill
- **All music crossfades between states** (no jarring transitions)

---

## Input System

### Abstraction Layer
```
Input {
  move: { x: -1..1, y: -1..1 }  // normalized
  look: { x: -1..1, y: -1..1 }
  action: boolean      // grab/interact
  attack: boolean
  jump: boolean
  sprint: boolean
  start: boolean       // pause
}
```

### Keyboard + Mouse
- WASD / Arrow keys: Move
- Mouse: Look
- Space: Jump
- Shift: Sprint
- Left Click: Attack
- Right Click / E: Grab
- ESC: Pause

### Gamepad
- Left stick: Move
- Right stick: Look
- A / Cross: Jump
- B / Circle: Grab
- X / Square: Attack
- RT / R2: Sprint
- Start: Pause

### Mobile Touch Overlay
- Left side: Virtual joystick (move)
- Right side: Touch drag (look)
- Jump button (bottom right)
- Grab button (bottom right, near jump)
- Attack button (bottom right, near grab)
- Semi-transparent, doesn't block too much view
- Auto-detected via touch events

---

## Rendering / Performance

- **Target:** 60fps on mid-range devices, 30fps on mobile
- **LOD system:** Distant geometry simplifies, particles reduce
- **Occlusion:** Islands below/behind not rendered when not visible
- **Draw calls:** Batch static geometry (islands) into merged buffers
- **Post-processing:** Minimal (bloom on weak points, color grading)
- **Shadow:** Single directional light shadow map, low resolution, cascade for close range only
- **Fog:** Distance fog hides pop-in and creates atmosphere

---

## File Structure (Single HTML approach)

```
polyshadow.html          ← Single entry point
  ├── <script type="module">
  │   ├── engine/         ← Core systems
  │   │   ├── renderer.js
  │   │   ├── input.js
  │   │   ├── audio.js
  │   │   ├── camera.js
  │   │   ├── physics.js
  │   │   ├── ui.js
  │   │   └── particles.js
  │   ├── world/          ← World generation
  │   │   ├── island.js
  │   │   ├── sky.js
  │   │   ├── fog.js
  │   │   └── paths.js
  │   ├── player/         ← Player systems
  │   │   ├── character.js
  │   │   ├── movement.js
  │   │   ├── climbing.js
  │   │   └── combat.js
  │   ├── colossus/       ← Boss systems
  │   │   ├── base.js
  │   │   ├── sentinel.js
  │   │   ├── wraith.js
  │   │   ├── titan.js
  │   │   └── behavior.js
  │   ├── game/           ← Game state
  │   │   ├── state.js
  │   │   ├── progression.js
  │   │   └── main.js
  │   └── utils/          ← Helpers
  │       ├── math.js
  │       ├── noise.js
  │       └── procedural.js
  └── </script>
```

Note: For the jam, this will be bundled into a single HTML file with all JS inline. For development, we can use separate files loaded via `<script type="module">`.

---

## Development Phases

### Phase 1: Foundation (Days 1-3)
- Three.js setup with importmap/es-module-shims
- Camera system (3rd person orbit)
- Input abstraction (keyboard+mouse first)
- Basic player character (box with legs placeholder)
- Procedural island generation (flat rock + grass)
- Movement: walk, run, jump
- Basic sky and lighting

### Phase 2: Climbing (Days 4-6)
- Grab system (detect climbable surfaces)
- Surface-relative movement
- Stamina system
- Cape physics (simple spring chain)
- Climb on test geometry
- Fall + respawn

### Phase 3: First Colossus (Days 7-9)
- Stone Sentinel geometry (procedural quadruped)
- Basic AI behavior (patrol, aggro)
- Climbable surface generation on colossus
- Weak points
- Combat (sword stab)
- Shake-off mechanic
- Death animation
- Arena island

### Phase 4: World Building (Days 10-12)
- Connect islands with traversal paths
- Wind current mechanics
- Fog/atmosphere layers
- Particle systems (dust, wind)
- Colossus direction indicators
- Hub island with shrine

### Phase 5: Remaining Colossi (Days 13-16)
- Wind Wraith: flying behavior, aerial combat, swoop-grab mechanic
- Tide Titan: multi-phase, water hazards, tilting shell
- Unique arenas for each

### Phase 6: Polish (Days 17-19)
- Procedural audio system (all sounds)
- Layered music system
- Post-processing (bloom, color grading)
- Win state / ending sequence
- Mobile touch overlay
- Gamepad support
- UI refinement (stamina arc, title card, credits)

### Phase 7: Jam Prep (Days 20-21)
- Performance optimization
- Final testing across browsers
- Deploy to hosting
- Submit HTML to jam form

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Climbing feels bad | Start with simple "snap to surface" approach, iterate on feel |
| Performance on mobile | LOD system, reduced particles, lower shadow quality on mobile |
| Scope creep with 3 colossi | Colossus 2 and 3 reuse climbing/combat systems, only behavior differs |
| Single file gets too large | Minify for production, develop with separate modules |
| Procedural audio sounds bad | Use simple, proven techniques (filtered noise, sine waves); test early |

---

## Success Metrics

1. Game loads and is playable within 3 seconds
2. Climbing a colossus feels tense and satisfying
3. The scale difference between player and colossi is awe-inspiring
4. The atmosphere (lighting, audio, particles) creates a strong "vibe"
5. All 3 colossi are defeat-able with distinct experiences
6. The ending transformation feels earned and memorable
7. Works on desktop (Chrome, Firefox, Safari) and mobile (iOS Safari, Chrome)
