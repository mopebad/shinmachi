import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {shindoTrackPlugin} from './tools/shindo-track-manifest.mjs';
import {sceneAuthoringPlugin} from './tools/scene-authoring-plugin.mjs';

export default defineConfig({
  plugins: [shindoTrackPlugin(),sceneAuthoringPlugin(),{
    name: 'local-visual-review',
    configureServer(server) {
      server.middlewares.use('/__review/capture', (request, response) => {
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        let body = ''; request.on('data', chunk => { body += chunk; if (body.length > 16000000) request.destroy(); });
        request.on('end', async () => {
          try {
            const { name, png,webm,mp4,wav, metadata } = JSON.parse(body);
            if (!/^[a-z0-9-]{1,70}$/.test(name) || (png !== undefined && !/^data:image\/png;base64,/.test(png))||(webm!==undefined&&!/^data:video\/webm;base64,/.test(webm))||(mp4!==undefined&&!/^data:video\/mp4;base64,/.test(mp4))||(wav!==undefined&&!/^data:audio\/wav;base64,/.test(wav))||[png,webm,mp4].filter(v=>v!==undefined).length>1) throw new Error('Invalid capture');
            const directory = resolve(server.config.root, png === undefined&&webm===undefined&&mp4===undefined&&wav===undefined ? 'quality' : 'quality/captures'); await mkdir(directory, { recursive: true });
            if (png !== undefined) await writeFile(resolve(directory, `${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
            if (webm !== undefined) await writeFile(resolve(directory, `${name}.webm`), Buffer.from(webm.split(',')[1], 'base64'));
            if (mp4 !== undefined) await writeFile(resolve(directory, `${name}.mp4`), Buffer.from(mp4.split(',')[1], 'base64'));
            if (wav !== undefined) await writeFile(resolve(directory, `${name}.wav`), Buffer.from(wav.split(',')[1], 'base64'));
            await writeFile(resolve(directory, `${name}.json`), JSON.stringify(metadata, null, 2) + '\n');
            response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ saved: png === undefined&&webm===undefined&&mp4===undefined&&wav===undefined ? `quality/${name}.json` : `quality/captures/${name}.${mp4?'mp4':webm?'webm':wav?'wav':'png'}` }));
          } catch { response.statusCode = 400; response.end('Capture failed'); }
        });
      });
    },
  }, {
    name: 'reload-scene-on-edit',
    // A scene owns GPU resources and document-level input. Reload atomically during edits
    // instead of mounting a second WebGL world via module hot replacement.
    handleHotUpdate({ server, file }) { if (/[\\/]assets-source[\\/]/.test(file) || file.includes('/quality/') || file.includes('\\quality\\') || /[\\/]authoring[\\/]scenes[\\/]/.test(file)||/\.json\.tmp$/.test(file)|| /\.md$/.test(file)) return []; server.ws.send({ type: 'full-reload' }); return []; },
  }],
  build: {
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/three/build/') || id.includes('node_modules/three/src/')) return 'three-core';
      if (id.includes('node_modules/three/examples/')) return 'render-effects';
    } } },
  },
});
