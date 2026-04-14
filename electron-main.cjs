const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const { createServer } = require('http');
const { ExpressPeerServer } = require('peer');

let server;
const PORT = 5173; // Match the port used in network.js for local/LAN gaming

function startServer() {
  const expressApp = express();
  
  // Create HTTP Server
  server = createServer(expressApp);

  // Attach PeerJS Signaling Server
  const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/app'
  });
  
  expressApp.use('/peerjs', peerServer);

  // Serve static game files
  expressApp.use(express.static(path.join(__dirname, 'dist')));
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Internal server + PeerServer running at http://0.0.0.0:${PORT}`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: "Poder & Gloria: Operaciones Globales"
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (server) server.close();
    app.quit();
  }
});
