# Aaiya Pain Guide

Whole-body 3D anatomy: click a part or describe where it hurts. Education, not diagnosis. Built from `mirror-anatomy-spec.md`.

## First run

1. Install Node.js 20.12+ (LTS).
2. `npm install` (also copies the Draco decoder to `public/draco` so the model loads offline).
3. `copy .env.local.example .env.local` and set `OPENROUTER_API_KEY`.
4. Model: `public/model/body.glb` (copied from `assets/Muscle.glb`). Then:
   ```bash
   npm run index      # data/parts.generated.json from the GLB's node names
   npm run dev        # open /debug first to confirm the names, then /
   ```
5. Before the demo: `npm run phrases` (voice accuracy, need 16/20) and `npm run warm` (pre-generates every card; resumable).

Scripts: `index`, `warm`, `regions` (fallback, then `USE_REGIONS=1`), `phrases`, `typecheck`.

## Notes

- Identity is the raw Blender node name (`userData.name`), never `object.name`. Muscle.glb stores spaces as `_`; `parsePart` undoes that for display.
- Left/right share one cached card per part (keyed by the side-less name).
- Jev response shape: <https://openrouter.ai/docs/guides/community/jev-tutorial>.
