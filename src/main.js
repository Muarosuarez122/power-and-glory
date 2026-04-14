/**
 * PODER & GLORIA — Main Entry Point
 * Political Strategy Game · Real-time Multiplayer
 */
import './style.css';
import { Network } from './network.js';
import { GameUI } from './ui.js';
import { initParticles } from './particles.js';

// Boot
const app = document.getElementById('app');
const network = new Network();
const ui = new GameUI(app, network);

// Init animated background particles
initParticles(document.body);

// Handle disconnects gracefully
network.onDisconnect = () => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content panel">
      <h3>⚠️ Desconectado</h3>
      <p>El otro jugador se ha desconectado de la partida.</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btnDisconnectOk">Volver al Menú</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btnDisconnectOk').addEventListener('click', () => {
    overlay.remove();
    network.destroy();
    ui.game = null;
    ui.selectedRegion = null;
    ui.opponentName = '';
    ui.chatMessages = [];
    ui.renderMenu();
  });
};

network.onError = (err) => {
  console.error('[App] Network error:', err);
};

// Start at menu
ui.renderMenu();
