import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'reload-scene-on-edit',
    // A scene owns GPU resources and document-level input. Reload atomically during edits
    // instead of mounting a second WebGL world via module hot replacement.
    handleHotUpdate({ server }) { server.ws.send({ type: 'full-reload' }); return []; },
  }],
  build: {
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/three/build/') || id.includes('node_modules/three/src/')) return 'three-core';
      if (id.includes('node_modules/three/examples/')) return 'render-effects';
    } } },
  },
});
