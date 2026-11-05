# Local scene authoring

Run `npm.cmd run dev -- --host 127.0.0.1`, then open [the editor](http://127.0.0.1:5173/?editor=1). Normal gameplay has no authoring panel; production excludes its code and write API.

Choose Shindo or Yoto, then an object from the list or click its mesh. **W / E / R** select move, rotate and scale gizmos. The inspector accepts local metres, degrees and scale. **Frame object**, right-drag orbit and wheel zoom help inspection. Select a light to change its color, intensity or distance. **Undo**, **Discard local**, **Reload disk** and **Save scene** operate on the selected scene. Switching scenes reloads its disk version; save first. **Resume play** restores the player camera, input and music interactions.

**Save scene writes repository JSON.** It does not use browser storage. The development API permits only the two pilot scene files, validates bounded edits and rejects stale revisions. Reload disk before resolving a conflict. Furniture stays within existing collision reservations; broad layout changes require deliberate changes to the authoritative gameplay layout too. The fixed deck/amplifier keep their animated console aligned. Speaker audio positions follow the saved speaker transforms.

| Change | Edit |
|---|---|
| Place an object or light | [Shindo scene](src/world/authoring/scenes/shindo.json) / [Yoto scene](src/world/authoring/scenes/yoto.json), or the editor |
| Register a model, finish variation or reusable assembly | [Asset/prefab catalog](src/world/authoring/catalog.json) |
| Add another generated attachment frame | Small adapter in [AuthoredEnvironments](src/world/authoring/AuthoredEnvironments.ts) / its district constructor |
| Change actual pilot model geometry | Packed editable sources in [assets-source/workflow2](assets-source/workflow2/) |

Scene format version 1 uses stable IDs, explicit transforms and `metres-y-up-radians`. Transforms are relative to a parent, generated anchor or scene origin. Prefab children can have their own parents. Catalog assets own the local GLB path, dimensions, source/license and named material settings; placements reference IDs. A world-wide registry caches source loads, shares geometry/materials, and batches repeated placements with instancing. Generated parcels, navigation and simulation remain authoritative.

For a new model: retain its licensed source, make a packed editable Blender file, export an optimized metre-scale Y-up GLB into `public/assets`, record provenance/dimensions in the catalog, then reference its ID in a scene or prefab. Named material variations support color, roughness, metalness, emission and the existing walnut/leather PBR finishes. Reuse the asset ID across scenes; do not duplicate the source file.

Pilot rebuild, from the project root with Blender 4.5 available:

```text
blender --background --python tools/build-workflow-assets.py
npm.cmd run check
npm.cmd test
npm.cmd run build
```

The exporter uses the saved editable Blender files, preserving manual edits; it reduces maps only in memory before export. `-- --from-originals` explicitly recreates those Blender files from the retained original GLBs. The two exterior source modules were frozen from existing generation using `freezeYoto()` in [browser checks](tools/workflow2-browser-checks.mjs); snapshot writes are limited to their two named source GLBs. Geometry editing stays in Blender.

Missing pilot assets fall back to existing visuals; `?authored=0` selects the complete legacy presentation. Git checkpoint: `checkpoint-workflow2`. [Visual comparisons and verification](quality/WORKFLOW_2_REVIEW.html).

Current limits: this is a bounded placement/light editor, without an asset browser, add/delete UI, collision editing or cross-session undo. Storefront door, window and sign geometry is retained inside each editable facade GLB, not separately selectable yet. Background city and other districts remain procedural. Desktop WebGL was measured; mobile hardware was not.
