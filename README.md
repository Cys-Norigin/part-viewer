# Part Viewer

A browser stage that frames a part and turns it until you drag. Overall width, depth, and height are drawn beside those sides, in millimetres.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:8080

Drop an STL, OBJ, or GLB onto the stage to replace the sample. Dimensions treat the file’s units as millimetres.

## The viewer

- `src/components/part-stage.tsx` — orbit, auto-spin, dimension lines
- `src/lib/load-part.ts` — file loading, centering, studio material
- `src/routes/index.tsx` — the page
