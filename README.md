# Dental 3D

The dental clinical module from basic-medic-web, as a standalone Vite + React app:
a generated 3D mouth with all 32 teeth (layers, jaw control, surface picking, tooth
section view), an FDI odontogram with primary teeth, tooth search, charted findings
and dental reference data.

## Run

    npm install
    npm run dev        # http://localhost:5173
    npm test
    npm run build

## Layout

- `src/components/dental/` — the module, copied unchanged from the main app
  - `DentalCase.jsx` — the case screen (site selection, chart, insights)
  - `three/` — the 3D mouth (`DentalViewer`, `DentalScene`, `ToothSection`, materials, model loader)
  - `Odontogram.jsx`, `ToothPicker.jsx`, `ToothPanel.jsx`, `toothSelection.js`
- `src/data/teeth.js`, `src/data/dental.js` — tooth catalogue, conditions, regions, reference data
- `src/assets/models/dentition.bin` — the baked model (meshopt-compressed)
- `scripts/dental-model/` — the generator that bakes the model from signed distance fields,
  so there is no third-party model licence. Rebuild with `npm run bake:dental` (about 3 minutes).

## Differences from the main app

- `src/components/CaseForm.jsx` is a cut-down copy: same props, but no API, router,
  MR number or patient history. Submitting shows the case payload on the page
  instead of starting an AI work-up.
- `src/components/anatomy/anatomyModel.js` holds only `STAGE_COLORS`, the one thing the mouth uses from it.
- `CameraRig.jsx` and `hasWebGL.js` are copied unchanged.
