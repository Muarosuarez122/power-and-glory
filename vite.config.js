import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,  // Expose on local network for multiplayer
    port: 5173,
  },
});
