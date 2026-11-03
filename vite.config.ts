import { defineConfig } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [{
    name: 'local-visual-review',
    configureServer(server) {
      server.middlewares.use('/__review/capture', (request, response) => {
        if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
        let body = ''; request.on('data', chunk => { body += chunk; if (body.length > 16000000) request.destroy(); });
        request.on('end', async () => {
          try {
            const { name, png, metadata } = JSON.parse(body);
            if (!/^[a-z0-9-]{1,70}$/.test(name) || !/^data:image\/png;base64,/.test(png)) throw new Error('Invalid capture');
            const directory = resolve(server.config.root, 'quality/captures'); await mkdir(directory, { recursive: true });
            await writeFile(resolve(directory, `${name}.png`), Buffer.from(png.split(',')[1], 'base64'));
            await writeFile(resolve(directory, `${name}.json`), JSON.stringify(metadata, null, 2) + '\n');
            response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ saved: `quality/captures/${name}.png` }));
          } catch { response.statusCode = 400; response.end('Capture failed'); }
        });
      });
    },
  }, {
    name: 'reload-scene-on-edit',
    // A scene owns GPU resources and document-level input. Reload atomically during edits
    // instead of mounting a second WebGL world via module hot replacement.
    handleHotUpdate({ server, file }) { if (file.includes('/quality/') || file.includes('\\quality\\') || /\.md$/.test(file)) return []; server.ws.send({ type: 'full-reload' }); return []; },
  }],
  build: {
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/three/build/') || id.includes('node_modules/three/src/')) return 'three-core';
      if (id.includes('node_modules/three/examples/')) return 'render-effects';
    } } },
  },
});
