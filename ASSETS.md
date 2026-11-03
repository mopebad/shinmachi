# Asset provenance

- All city geometry, signs, procedural textures, characters and vehicles in this version are generated from project source code. No external photographs, models, downloaded texture packs, or generated image assets are bundled.
- All ambient audio is synthesized locally with Web Audio: seeded noise, oscillator engines/hums, formant-like unintelligible crowd texture, and crossing chirps. No external recordings, music, dialogue, audio libraries, or audio CDN are used. Steam uses a locally generated radial-alpha canvas texture.
- Surface maps and signage are drawn locally with the browser canvas. Japanese text uses installed system fonts (`Yu Gothic`, `Meiryo`, then sans-serif); the project does not redistribute font files or fetch web fonts. Glyph shape depends on the host OS.
- Business names and district geography are fictional. Railway/station styling is inspired by Japanese urban infrastructure and is not an official railway operator asset.
- Three.js and its bundled example utilities are used under their MIT license; dependency license files are retained in the installed packages. Vite and TypeScript remain development dependencies.
- Future external assets must have an explicit license/attribution entry here, be stored locally, and have a procedural fallback before they are integrated.

- The November 2026 visual pass adds original procedural skyline/tower geometry, commuter train windows with illustrated passenger silhouettes, station wayfinding and area-map canvases, four sign aspect layouts, material bump/roughness maps and a road reflection mask. No external reference photographs are included in the app. The train and line identities remain fictional.

- Production Pass 1 adds three original project-authored GLB models, loaded with GLTFLoader and instanced by material. They are generated locally rather than downloaded. [ASSET_MANIFEST.md](./ASSET_MANIFEST.md) records the source, dimensions, materials, runtime use and dependency licenses.
