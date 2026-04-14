import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Enable relative paths for GitHub Pages deploying cleanly 
  server: {
    host: true,  // Expose on local network for multiplayer
    port: 5173,
  },
});

