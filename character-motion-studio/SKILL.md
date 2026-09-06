---
name: character-motion-studio
description: Build and maintain a team-shareable SVG character motion studio from 2–10 uploaded SVG states or named Figma frames, including path-based morphing, per-state behaviors, idle motion, easing controls, and browser/media exports.
---

# Character Motion Studio — team pilot

This package contains a tested two-state case study plus the workflow for expanding a named character set to 2–10 states. Use its reusable runtime and exporter modules when the user asks to create or maintain a character animation studio.

## Accepted inputs

- **SVG files:** accept one ordered group of 2–10 SVG files. Preserve file order as state order. Use stable layer/path ids to match shared parts; treat parts missing from some states as decorations/orphans.
- **Figma links:** when the user pastes a Figma file, section, component, or frame link, use the available Figma connector to read the referenced frames and export their named vector layers. Never claim the standalone HTML can bypass Figma authentication. If the connector is unavailable, ask for SVG exports instead.
- For Figma, require each state frame to have a unique state name and corresponding character layers to share exact names such as `body-main`, `eye-left`, and `eye-right`. Preserve named non-shared layers as decorations.

When building more than two states, use the N-state state-machine and per-path strategy architecture from the installed `svg-character-animator` skill: render shared paths once, read the live path when interrupting a transition, and route compatible paths to control-point interpolation and incompatible topology to sampled morphing.

## Working files

- `assets/studio/work/source/`: the two original user SVGs.
- `assets/studio/work/build.py`: maps original path indices to semantic parts and bundles the offline HTML.
- `assets/studio/work/config.js`: validated settings, Curve/Spring presets, export configuration.
- `assets/studio/work/runtime.js`: persistent render nodes, interruptible morphing, independent behaviors, deterministic stepping.
- `assets/studio/work/exporters-v2.js`: browser media export, SVG snapshots, experimental AE JSX, Rive preparation ZIP.
- `assets/studio/work/ui.js`, `shell.html`: complete editable interface.
- Read `references/delivery.md` for the actual capabilities and current validation limits.

Build with `python3 assets/studio/work/build.py`. The result is `assets/studio/outputs/角色动画实验室.html`. The bundle includes its runtime dependencies and does not fetch them when opened. Do not edit the generated HTML directly.

## Invariants

1. Shared semantic names identify correspondence; matching organs alone does not establish compatible curve topology. The current path-index mapping is specific to the supplied source files. Re-map before substituting artwork.
2. Preserve compound-path holes and the source stacking order. Never approximate transparent holes with the preview background color.
3. Retarget from rendered geometry; keep idle motion phase persistent. Treat opacity and mask scales separately from overshooting geometry.
4. Keep global settings and per-state behavior overrides independent. Export a validated, versioned settings object; identify it as studio settings rather than Lottie/Rive JSON.
5. Use the same runtime and easing function for playback and deterministic export. Do not record the screen or rename a WebM file to MP4. Detect codec support and report failure accurately.
6. Video/GIF/animated SVG are baked playback. HTML preserves interactions. Native authoring and interactive state-machine transfer are separate problems.
7. AE JSX is experimental until a real AE import is validated. Rive ZIP contains editable SVG preparation assets, not a `.riv` project. Keep these limitations visible in the UI and handoff.
8. Show all implemented controls, with explanatory disabled states for incompatible formats or absent parts. Preserve the grayscale interface and source character colors.

## Validation

For runtime edits, test both endpoints, repeated mid-transition reversal, negative/overshooting easing, and per-state parameter isolation. For exporter edits, produce files and independently inspect dimensions, duration, frame count, transparency and decoded imagery. Test cancellation and the exported HTML in a fresh browser context with network disabled. Never substitute browser tests for AE/Rive authoring validation.

`scripts/verify.cjs` provides browser tests. It requires Playwright; run it from `assets/studio` with Node.js. Set `CHROME_PATH` to an existing Chrome executable, or install Playwright's Chromium. The tests write only into the package's `assets/studio/work` directory.

The bundled green-character HTML remains the verified two-state example. For a new 2–10-state character, generate its semantic state data from uploaded SVGs or named Figma frames, handle missing parts and topology differences, and test the supplied character before delivery. Do not silently simplify the artwork or imply that the example HTML itself contains unseen states.
