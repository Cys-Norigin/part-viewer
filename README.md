# Part Viewer

A browser stage that frames an STL, OBJ, or GLB, then turns it until you drag.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:8080

## The viewer

- `src/components/part-stage.tsx` — orbit, auto-spin, wire, section cut
- `src/lib/load-part.ts` — file loading, centering, studio material
- `src/routes/index.tsx` — page, file drop, controls

STL and OBJ use the studio plastic. GLB keeps its own materials. Dimensions are in the file’s own units.
