# Workflow 2 pilot assets

Sources and licenses checked 2026-11-05. Runtime assets are local; no new dependencies.

| Runtime asset | Source / license | Preparation |
|---|---|---|
| stool.glb | Innerscene [Pivot swivel bar stool](https://www.innerscene.com/tools/library/3d-parts/pivot-swivel-bar-stool-f2ac959b), **CC0 1.0** | Removed the named back component in Blender; fitted to the existing 0.40 × 0.40 m reservation, 0.74 m high. Retained cushion seams, welts, gas-lift fittings and foot ring. Uses the existing Poly Haven leather finish. 344 KB. |
| yoto-ramen.glb, yoto-izakaya.glb | Original Shinmachi geometry and signage | Frozen from the two existing generated frontages, consolidated by material, edited/exported through Blender. Same parcel origins, doors and silhouette. Runtime walnut PBR replaces the procedural wood. About 1.01 MB and 0.94 MB. |

The reused walnut, leather, hi-fi and barware retain their [existing source credits](../shindo/CREDITS.md). Original exterior lantern, condenser and lamp retain the project's [nightlife provenance](../nightlife/README.md).

Original downloaded stool SHA-256: `4cc33db3531eee0b8047f2858fe9b6ea06840aa433610be0a3c272a68190cf80`.

Original GLBs and packed editable Blender files: [assets-source/workflow2](../../../assets-source/workflow2/). Export: [build-workflow-assets.py](../../../tools/build-workflow-assets.py), tested with Blender 4.5.3. Maps are reduced to 512px, or 1024px for elongated sign faces; JPEG quality 82. Blender Z-up becomes glTF Y-up, units are metres. Measured bounds and runtime byte sizes are in [metadata.json](./metadata.json).
