import express from 'express';
import { ExpressPeerServer } from 'peer';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5173;

// Servir los archivos construidos estáticos del juego (cliente)
app.use(express.static(path.join(__dirname, 'dist')));

// Iniciar el servidor Express
const server = app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🚀 SERVIDOR "PODER & GLORIA" EN LÍNEA 🚀`);
  console.log(`===========================================\n`);
  
  console.log(`Para jugar tú en esta PC, abre:`);
  console.log(`👉 http://localhost:${PORT}\n`);

  console.log(`Para que juegue tu amigo (si está en tu red Wi-Fi / VPN),`);
  console.log(`debe abrir la siguiente IP de tu PC:`);
  
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`👉 http://${iface.address}:${PORT}`);
      }
    }
  }
  
  console.log(`\n[Nota]: Tu PC ahora es el servidor absoluto de comunicación P2P y de la Web.`);
  console.log(`No necesitas internet externo, solo estar conectados a la misma red (Hamachi, Radmin, o WiFi Local).`);
});

// Adjuntar el servidor de señalización de PeerJS directamente en nuestro server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/app'
});

app.use('/peerjs', peerServer);
