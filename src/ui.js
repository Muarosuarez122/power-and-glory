/**
 * PODER & GLORIA — UI Renderer
 * All DOM rendering and user interaction logic.
 * Features: Chat, Sound FX, Surrender, Victory Progress Bar
 */
import {
  createGameState, getActions, performAction, endTurn, canAfford,
  getRegionOwner, countRegions, getMaxRounds, getActionsPerTurn, getTotalScore,
  determineWinner
} from './game.js';
import { SFX } from './sfx.js';

// ===== Toast System =====
let toastContainer = null;
function showToast(msg, type = 'info') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(40px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

// ===== Confetti =====
function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#d4a843', '#f0d070', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#fff'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.width = (6 + Math.random() * 8) + 'px';
    piece.style.height = (6 + Math.random() * 8) + 'px';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    piece.style.animationDuration = (2 + Math.random() * 3) + 's';
    piece.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 6000);
}

// ===== Event Modal =====
function showEventModal(event, onClose) {
  SFX.event();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content panel" style="animation: fadeSlideUp 0.5s ease forwards;">
      <div style="font-size:3rem; margin-bottom:8px;">⚡</div>
      <h3>${event.name}</h3>
      <p>${event.desc}</p>
      <p style="color:var(--gold-light); font-weight:600; font-size:0.95rem; margin-bottom:16px;">${event.message}</p>
      <div class="modal-actions">
        <button class="btn btn-primary" id="btnEventOk">Entendido</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btnEventOk').addEventListener('click', () => {
    SFX.click();
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 300);
  });
}

// ===== Confirm Modal =====
function showConfirmModal(title, message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content panel" style="animation: fadeSlideUp 0.4s ease forwards;">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-danger" id="btnConfirmYes">Confirmar</button>
        <button class="btn" id="btnConfirmNo">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btnConfirmYes').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  document.getElementById('btnConfirmNo').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
}

// ===== Main UI Class =====
export class GameUI {
  constructor(app, network) {
    this.app = app;
    this.network = network;
    this.game = null;
    this.myIndex = -1;
    this.selectedRegion = null;
    this.playerName = '';
    this.opponentName = '';
    this.chatMessages = [];
    this.chatOpen = false;
    this.unreadChat = 0;
  }

  // ────── MENU SCREEN ──────
  renderMenu() {
    this.app.innerHTML = `
      <div class="bg-pattern"></div>
      <div class="screen-menu">
        <div class="menu-container panel">
          <div class="menu-logo">
            <h1>Poder & Gloria</h1>
            <div class="subtitle">Estrategia Política</div>
          </div>
          <div class="menu-divider"></div>

          <div class="player-name-section">
            <label for="playerNameInput">Tu nombre de político</label>
            <input id="playerNameInput" class="input" type="text" placeholder="Ej: El Presidente" maxlength="20" />
          </div>

          <div class="menu-actions">
            <button id="btnCreate" class="btn btn-primary btn-lg">🏛️ Crear Sala</button>
            <div class="menu-input-group">
              <input id="joinCodeInput" class="input" type="text" placeholder="Código de sala" maxlength="5" style="text-transform:uppercase; letter-spacing:3px; text-align:center; font-weight:800;" />
              <button id="btnJoin" class="btn btn-lg">🤝 Unirse</button>
            </div>
          </div>

          <div class="how-to-play">
            <h3>📜 Cómo Jugar</h3>
            <ol>
              <li>Crea una sala o únete con un código</li>
              <li>Cada ronda tienes 2 acciones: campañas, sobornos, escándalos...</li>
              <li>Gana influencia en las 9 regiones del mapa</li>
              <li>Después de 10 rondas, quien controle más regiones ¡gana!</li>
              <li>Eventos aleatorios pueden cambiar el rumbo del juego</li>
            </ol>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCreate').addEventListener('click', () => {
      SFX.click();
      this._handleCreate();
    });
    document.getElementById('btnJoin').addEventListener('click', () => {
      SFX.click();
      this._handleJoin();
    });
    document.getElementById('joinCodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleJoin();
    });
  }

  _getName() {
    const input = document.getElementById('playerNameInput');
    const name = (input?.value || '').trim();
    return name || `Político ${Math.floor(Math.random() * 999)}`;
  }

  async _handleCreate() {
    this.playerName = this._getName();
    this.myIndex = 0;

    try {
      const code = await this.network.createRoom();
      this._renderLobby(code, true);

      this.network.onConnected = (peerName) => {
        this.opponentName = peerName;
        this._updateLobbyPlayer(peerName);
        SFX.yourTurn();
        showToast(`${peerName} se ha unido!`, 'success');
      };

      this.network.onData = (data) => {
        if (data.type === 'handshake') {
          this.opponentName = data.name;
          this._updateLobbyPlayer(data.name);
          this.network.sendHandshake(this.playerName);
        }
      };

    } catch (err) {
      showToast('Error al crear sala: ' + err.message, 'error');
    }
  }

  async _handleJoin() {
    this.playerName = this._getName();
    this.myIndex = 1;
    const code = document.getElementById('joinCodeInput')?.value?.toUpperCase().trim();
    if (!code || code.length < 4) {
      showToast('Ingresa un código de sala válido', 'error');
      SFX.negative();
      return;
    }

    try {
      showToast('Conectando...', 'info');
      await this.network.joinRoom(code);
      this.network.sendHandshake(this.playerName);

      this.network.onData = (data) => {
        if (data.type === 'handshake') {
          this.opponentName = data.name;
          this._renderLobby(code, false);
          this._updateLobbyPlayer(this.opponentName);
          SFX.yourTurn();
          showToast(`Conectado con ${data.name}!`, 'success');
        }
        if (data.type === 'start') {
          this.game = data.state;
          this.renderGame();
          SFX.action();
        }
        if (data.type === 'gameState') {
          this.game = data.state;
          this.renderGame();
        }
      };

      this._renderLobby(code, false);

    } catch (err) {
      showToast('No se pudo conectar: ' + err.message, 'error');
      SFX.negative();
    }
  }

  // ────── LOBBY SCREEN ──────
  _renderLobby(code, isHost) {
    this.app.innerHTML = `
      <div class="bg-pattern"></div>
      <div class="screen-lobby">
        <div class="lobby-container panel">
          <div class="lobby-header">
            <h2>🏛️ Sala de Espera</h2>
            <div class="lobby-code">
              <span>Código:</span>
              <span class="code-value" id="lobbyCodeValue">${code}</span>
              <button class="btn btn-sm" id="btnCopyCode" title="Copiar código">📋</button>
            </div>
          </div>

          <div class="lobby-players">
            <h3>Jugadores</h3>
            <div class="player-slot card" style="border-left: 3px solid var(--gold);">
              <div class="player-icon" style="background: var(--gold);">1</div>
              <div class="player-info">
                <div class="player-name">${this.myIndex === 0 ? this.playerName : (this.opponentName || 'Esperando...')}</div>
                <div class="player-status">${this.myIndex === 0 ? 'Anfitrión • Tú' : (this.opponentName ? 'Anfitrión' : 'Esperando...')}</div>
              </div>
            </div>
            <div class="player-slot card ${!this.opponentName && this.myIndex === 0 ? 'empty' : ''}" id="player2Slot" style="border-left: 3px solid var(--blue-light);">
              <div class="player-icon" style="background: var(--blue-light);">2</div>
              <div class="player-info">
                <div class="player-name" id="player2Name">${this.myIndex === 1 ? this.playerName : (this.opponentName || 'Esperando rival...')}</div>
                <div class="player-status" id="player2Status">${this.myIndex === 1 ? 'Retador • Tú' : (this.opponentName ? 'Retador' : '<span class="waiting-dots">Conectando</span>')}</div>
              </div>
            </div>
          </div>

          <div class="lobby-actions">
            ${isHost ? `<button id="btnStartGame" class="btn btn-primary btn-lg" ${!this.opponentName ? 'disabled' : ''}>⚔️ Iniciar Partida</button>` : `<div style="text-align:center;color:var(--text-dim);font-size:0.9rem;">Esperando a que el anfitrión inicie la partida<span class="waiting-dots"></span></div>`}
            <button id="btnLeaveLobby" class="btn btn-danger">Salir</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCopyCode')?.addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        SFX.click();
        showToast('Código copiado!', 'gold');
      });
    });

    if (isHost) {
      document.getElementById('btnStartGame')?.addEventListener('click', () => this._startGame());
    }

    document.getElementById('btnLeaveLobby')?.addEventListener('click', () => {
      this.network.destroy();
      this.renderMenu();
    });
  }

  _updateLobbyPlayer(name) {
    const nameEl = document.getElementById('player2Name');
    const statusEl = document.getElementById('player2Status');
    const slotEl = document.getElementById('player2Slot');
    const startBtn = document.getElementById('btnStartGame');
    if (nameEl) nameEl.textContent = name;
    if (statusEl) statusEl.textContent = this.myIndex === 0 ? 'Retador' : 'Retador • Tú';
    if (slotEl) slotEl.classList.remove('empty');
    if (startBtn) startBtn.disabled = false;
  }

  _startGame() {
    if (!this.opponentName) {
      showToast('Espera a que un jugador se una', 'error');
      return;
    }

    const p0 = this.myIndex === 0 ? this.playerName : this.opponentName;
    const p1 = this.myIndex === 0 ? this.opponentName : this.playerName;
    this.game = createGameState(p0, p1);
    this.chatMessages = [];
    this.network.sendStart(this.game);

    this.network.onData = (data) => this._handleGameData(data);

    this.renderGame();
    SFX.yourTurn();
    showToast('⚔️ ¡La campaña comienza!', 'gold');
  }

  // ────── GAME DATA HANDLER ──────
  _handleGameData(data) {
    if (data.type === 'action') {
      const logEntry = performAction(this.game, data.actionId, data.regionId);
      if (logEntry) {
        this.renderGame();
        showToast(logEntry.message, 'info');
      }
    }
    if (data.type === 'endTurn') {
      endTurn(this.game);
      this.renderGame();
      if (this.game.lastEvent) {
        showEventModal(this.game.lastEvent, () => {
          this.renderGame();
        });
        this.game.lastEvent = null;
      }
      if (this.game.currentTurn === this.myIndex) {
        SFX.yourTurn();
        showToast('🎯 ¡Es tu turno!', 'gold');
      }
      if (this.game.gameOver) {
        this.renderGameOver();
      }
    }
    if (data.type === 'gameState') {
      this.game = data.state;
      this.renderGame();
      if (this.game.gameOver) {
        this.renderGameOver();
      }
    }
    if (data.type === 'chat') {
      this.chatMessages.push({
        from: this.opponentName,
        message: data.message,
        mine: false,
        time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      SFX.chat();
      this._appendChatMessage(this.chatMessages[this.chatMessages.length - 1]);
    }
    if (data.type === 'surrender') {
      this.game.gameOver = true;
      this.game.winner = this.myIndex;
      showToast(`🏳️ ${this.opponentName} se ha rendido!`, 'gold');
      this.renderGameOver();
    }
  }

  // ────── GAME SCREEN ──────
  renderGame() {
    if (!this.game) return;
    const g = this.game;
    const me = g.players[this.myIndex];
    const opp = g.players[this.myIndex === 0 ? 1 : 0];
    const isMyTurn = g.currentTurn === this.myIndex;
    const myFaction = this.myIndex === 0 ? 'gov' : 'reb';
    const actions = getActions().filter(a => a.faction === 'all' || a.faction === myFaction);
    const myRegions = countRegions(g, this.myIndex);
    const oppRegions = countRegions(g, this.myIndex === 0 ? 1 : 0);
    const totalInfluence0 = g.regions.reduce((s, r) => s + r.influence[0], 0);
    const totalInfluence1 = g.regions.reduce((s, r) => s + r.influence[1], 0);
    const totalInf = totalInfluence0 + totalInfluence1 || 1;
    const myInfPct = this.myIndex === 0
      ? (totalInfluence0 / totalInf * 100)
      : (totalInfluence1 / totalInf * 100);

    this.app.innerHTML = `
      <div class="bg-pattern"></div>
      <div class="screen-game">
        <!-- TOP BAR -->
        <div class="game-topbar">
          <div class="topbar-left">
            <div class="topbar-title">Rebel Inc: Coalición</div>
          </div>
          <div class="topbar-center">
            <div class="progress-war reputation-bar" style="max-width: 500px; margin: 0 auto;">
              <div class="pw-label pw-label-left" style="font-weight:800; font-size:0.9rem; color: #fff; text-shadow: 0 0 10px var(--gold);">
                REPUTACIÓN DE COALICIÓN: ${g.players[0].popularity}%
              </div>
              <div class="pw-bar" style="background: rgba(0,0,0,0.6); border: 2px solid ${g.players[0].popularity < 25 ? 'var(--blue-light)' : 'var(--gold)'}; border-radius: 6px; height: 16px;">
                <div class="pw-fill-left" style="width:${g.players[0].popularity}%; background: ${g.players[0].popularity < 25 ? 'var(--blue-light)' : 'var(--gold)'}; transition: all 0.5s; box-shadow: 0 0 15px ${g.players[0].popularity < 25 ? 'var(--blue-light)' : 'var(--gold)'}; border-radius: 4px;"></div>
              </div>
              <div class="pw-label pw-label-right" style="color:var(--text-dim); font-size:0.75rem; margin-top:2px;">
                Colapso inminente al 0%
              </div>
            </div>
          </div>
          <div class="topbar-right">
            <div class="turn-badge ${isMyTurn ? 'my-turn' : 'not-my-turn'}">
              ${isMyTurn ? '🎯 Tu Turno' : `⏳ ${opp.name}`}
            </div>
            <div class="topbar-round">
              R<strong>${Math.min(g.round, getMaxRounds())}</strong>/${getMaxRounds()}
            </div>
          </div>
        </div>

        <div class="game-body">
          <!-- LEFT SIDEBAR: My Stats -->
          <div class="sidebar-left">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">💰</span> Presupuesto</div>
                <div class="stat-value" style="color: var(--gold-light);">$${me.money}</div>
              </div>
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">⭐</span> Reputación</div>
                <div class="stat-value" style="color: var(--green-light);">${me.popularity}%</div>
              </div>
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">🪖</span> Reserva</div>
                <div class="stat-value" style="color: var(--red-light);">${me.military}</div>
              </div>
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">📡</span> Inteligencia</div>
                <div class="stat-value" style="color: var(--text);">${me.resources}</div>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">🗺️</span> Regiones</div>
                <div class="stat-value" style="color: var(--gold);">${myRegions} / ${g.regions.length}</div>
              </div>
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">🎬</span> Acciones</div>
                <div class="stat-value" style="color: ${isMyTurn ? 'var(--gold-light)' : 'var(--text-muted)'};">${isMyTurn ? g.actionsLeft : '-'}</div>
              </div>
            </div>

            <!-- Opponent mini stats -->
            <div class="opponent-section">
              <div class="section-label">Oposición: ${opp.name}</div>
              <div class="opponent-mini-stat">
                <span class="opp-label">💰 Presupuesto</span>
                <span>$${opp.money}</span>
              </div>
              <div class="opponent-mini-stat">
                <span class="opp-label">⭐ Reputación</span>
                <span>${opp.popularity}%</span>
              </div>
              <div class="opponent-mini-stat">
                <span class="opp-label">🪖 Reserva</span>
                <span>${opp.military}</span>
              </div>
              <div class="opponent-mini-stat">
                <span class="opp-label">📡 Inteligencia</span>
                <span>${opp.resources}</span>
              </div>
            </div>
          </div>

          <!-- CENTER: Tactical Map and Comms -->
          <div class="game-center">
            <div class="regions-title">
              🗺️ Mapa Táctico en Tiempo Real
              ${this.selectedRegion ? `<span class="selected-region-tag">📍 ${g.regions.find(r => r.id === this.selectedRegion)?.name || ''}</span>` : ''}
            </div>
            
            <div class="tactical-map">
              <svg class="map-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line x1="50" y1="15" x2="50" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="15" x2="75" y2="20" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="15" x2="25" y2="20" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="45" x2="20" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="45" x2="80" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="45" x2="75" y2="20" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="45" x2="25" y2="20" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="45" x2="50" y2="75" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="75" y1="20" x2="80" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="80" y1="45" x2="75" y2="70" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="75" y1="70" x2="50" y2="75" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="50" y1="75" x2="25" y2="70" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="25" y1="70" x2="20" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
                <line x1="20" y1="45" x2="25" y2="20" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>
              </svg>
              ${g.regions.map(r => this._renderRegionCard(r)).join('')}
            </div>

            <!-- INTEL & COMMUNICATIONS -->
            <div class="intel-panel panel">
              <div class="chat-header">
                <span>📡 COMUNICACIONES & INTELIGENCIA</span>
              </div>
              <div class="chat-messages" id="chatMessages">
                ${[...g.log.map(l => ({...l, isGameLog: true})), ...this.chatMessages.map(m => ({...m, isChat: true, timestamp: new Date(m.time).getTime() || Date.now()}))]
                  .sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0))
                  .map(entry => {
                    if (entry.isGameLog) {
                      return `<div class="log-entry ${entry.isEvent ? 'log-event' : ''} ${entry.player === this.myIndex ? 'log-mine' : ''}"><span class="log-time">R${entry.round}</span> ${entry.message}</div>`;
                    } else if (entry.isChat) {
                      return `<div class="chat-msg ${entry.mine ? 'mine' : 'theirs'}"><div class="chat-msg-name">${entry.from}</div><div class="chat-msg-text">${this._escapeHtml(entry.message)}</div><div class="chat-msg-time">${entry.time}</div></div>`;
                    }
                  }).join('')}
              </div>
              <div class="chat-input-area">
                <input class="input chat-input" id="chatInput" type="text" placeholder="Transmitir mensaje aliado o amenaza..." maxlength="200" />
                <button class="btn btn-sm btn-primary" id="btnChatSend">Enviar</button>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDEBAR: Actions -->
          <div class="sidebar-right">
            <div class="actions-title">⚡ Políticas${isMyTurn ? ` (${g.actionsLeft} restantes)` : ''}</div>
            ${actions.map(a => {
              const needsRegion = a.needsRegion;
              const affordable = isMyTurn && canAfford(g, a.id) && g.actionsLeft > 0;
              const regionSelected = !needsRegion || this.selectedRegion;
              const disabled = !affordable || !regionSelected || (a.id === 'combat' && g.peaceDuration > 0);
              let costStr = [];
              if(a.cost?.money) costStr.push(`$${a.cost.money}`);
              if(a.cost?.resources) costStr.push(`${a.cost.resources}📡`);
              if(a.cost?.military) costStr.push(`${a.cost.military}🪖`);
              if(a.cost?.popularity) costStr.push(`${a.cost.popularity}⭐`);
              const parts = a.name.split(' ');
              const icon = parts[0];
              const title = parts.slice(1).join(' ');
              return `
                <div class="action-card card ${disabled ? 'disabled' : ''}" data-action="${a.id}">
                  <div style="display:flex; align-items:center;">
                    <div style="font-size: 1.8rem; margin-right: 12px; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 8px; border: 1px solid var(--border); box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">${icon}</div>
                    <div style="flex:1;">
                      <div class="action-name" style="font-size:0.9rem; margin:0;">${title}</div>
                      <div class="action-desc" style="font-size:0.75rem; color:var(--text-dim); margin-top:4px; line-height:1.3;">
                        ${a.desc}${needsRegion && !this.selectedRegion && isMyTurn ? '<br/><em style="color:var(--gold); font-weight:bold;">📍 REQUIERE SELECCIÓN</em>' : ''}
                      </div>
                    </div>
                  </div>
                  <div class="action-cost" style="margin-top:8px; border-top:1px solid rgba(255,255,255,0.1); padding-top:6px; font-weight:800; font-size:0.75rem;">
                    ${costStr.length > 0 ? `COSTO OPR: ${costStr.join(' | ')}` : 'GRATUITO'}
                  </div>
                </div>
              `;
            }).join('')}
            <div class="end-turn-container">
              <button class="btn btn-primary" id="btnEndTurn" style="width:100%;" ${!isMyTurn ? 'disabled' : ''}>
                ${isMyTurn ? '⏭️ Terminar Turno' : '⏳ Esperando...'}
              </button>
              <button class="btn btn-danger btn-sm" id="btnSurrender" style="width:100%; margin-top:8px;">
                🏳️ Rendirse
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    this.app.querySelectorAll('.region-node').forEach(el => {
      el.addEventListener('click', () => {
        SFX.click();
        this.selectedRegion = el.dataset.region;
        this.renderGame();
      });
    });

    this.app.querySelectorAll('.action-card:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const actionId = el.dataset.action;
        this._doAction(actionId);
      });
    });

    document.getElementById('btnEndTurn')?.addEventListener('click', () => {
      if (!isMyTurn) return;
      SFX.click();
      endTurn(this.game);
      this.network.sendEndTurn();
      this.network.sendGameState(this.game);
      if (this.game.gameOver) {
        this.renderGameOver();
      } else {
        if (this.game.lastEvent) {
          showEventModal(this.game.lastEvent, () => {
            this.renderGame();
          });
          this.game.lastEvent = null;
        }
        this.renderGame();
        showToast('Turno terminado', 'info');
      }
    });

    document.getElementById('btnSurrender')?.addEventListener('click', () => {
      showConfirmModal(
        '🏳️ Rendirse',
        '¿Estás seguro de que quieres rendirte? Tu oponente ganará la partida.',
        () => {
          this.game.gameOver = true;
          this.game.winner = this.myIndex === 0 ? 1 : 0;
          this.network.sendSurrender();
          this.network.sendGameState(this.game);
          this.renderGameOver();
        }
      );
    });

    // Chat listeners
    this._setupChatListeners();

    // Scroll chat to bottom
    const chatMsgs = document.getElementById('chatMessages');
    if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }

  _setupChatListeners() {
    document.getElementById('btnChatSend')?.addEventListener('click', () => this._sendChat());
    document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._sendChat();
    });
  }

  _sendChat() {
    const input = document.getElementById('chatInput');
    const msg = (input?.value || '').trim();
    if (!msg) return;

    const chatMsg = {
      from: this.playerName,
      message: msg,
      mine: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.chatMessages.push(chatMsg);
    this.network.sendChat(msg);
    input.value = '';
    SFX.click();
    this._appendChatMessage(chatMsg);
  }

  _appendChatMessage(msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    // Remove empty placeholder
    const empty = container.querySelector('.chat-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.mine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
      <div class="chat-msg-name">${msg.from}</div>
      <div class="chat-msg-text">${this._escapeHtml(msg.message)}</div>
      <div class="chat-msg-time">${msg.time}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }


  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _renderRegionCard(region) {
    const coords = {
      capital: 'top: 45%; left: 50%;',
      norte: 'top: 15%; left: 50%;',
      sur: 'top: 75%; left: 50%;',
      costa: 'top: 45%; left: 20%;',
      industrial: 'top: 45%; left: 80%;',
      frontera: 'top: 20%; left: 75%;',
      selva: 'top: 70%; left: 75%;',
      desierto: 'top: 20%; left: 25%;',
      islas: 'top: 70%; left: 25%;'
    };
    const inlineStyle = coords[region.id] || '';

    const owner = getRegionOwner(region);
    const ownerClass = owner === 0 ? 'player-0' : owner === 1 ? 'player-1' : 'neutral';
    const selected = this.selectedRegion === region.id ? 'selected' : '';
    const total = (region.influence[0] || 0) + (region.influence[1] || 0);
    const p0w = total > 0 ? (region.influence[0] / Math.max(total, 1)) * 100 : 0;
    const p1w = total > 0 ? (region.influence[1] / Math.max(total, 1)) * 100 : 0;

    const hasInsurgents = (region.troops[1] || 0) > 0;
    const isStable = region.influence[0] === 100 && !hasInsurgents;

    return `
      <div class="region-node ${ownerClass} ${selected} ${hasInsurgents ? 'has-insurgents' : ''}" data-region="${region.id}" style="${inlineStyle}">
        <div class="node-influence-ring" style="background: conic-gradient(var(--gold) 0% ${p0w}%, var(--blue-light) ${p0w}% ${p0w + p1w}%, rgba(20,25,30,0.8) ${p0w + p1w}% 100%);"></div>
        <div class="node-inner" style="${isStable ? 'background-color: var(--gold);' : ''}">
          <div class="node-icon">${region.icon}</div>
        </div>
        ${hasInsurgents && !isStable ? `<div class="insurgent-warning" style="position:absolute; top:-30px; font-size:1.5rem; text-shadow:0 0 10px #f00;">⚠️</div>` : ''}
        <div class="troops-bubbles">
          ${region.troops && region.troops[0] > 0 ? `<div class="troop-bubble player-0">🛡️ ${region.troops[0]}</div>` : ''}
          ${region.troops && region.troops[1] > 0 ? `<div class="troop-bubble player-1">⚔️ ${region.troops[1]}</div>` : ''}
        </div>
        <div class="node-labels">
          <div class="node-name" style="${isStable ? 'color: var(--gold-light);' : ''}">${region.name} <span style="opacity:0.6">(${region.population}M)</span></div>
          <div class="node-inf-text">Estabilidad: ${region.influence[0]}% | Riesgo: ${region.influence[1]}%</div>
        </div>
      </div>
    `;
  }

  _doAction(actionId) {
    const actionDef = getActions().find(a => a.id === actionId);
    if (!actionDef) return;
    
    const needsRegion = actionDef.needsRegion;
    const regionId = needsRegion ? this.selectedRegion : null;

    if (needsRegion && !regionId) {
      showToast('Selecciona una región primero', 'error');
      SFX.negative();
      return;
    }

    const logEntry = performAction(this.game, actionId, regionId);
    if (logEntry) {
      SFX.action();
      this.network.sendAction(actionId, regionId);
      this.network.sendGameState(this.game);
      showToast(logEntry.message, 'success');
      this.renderGame();
    }
  }

  // ────── GAME OVER SCREEN ──────
  renderGameOver() {
    if (!this.game) return;
    const g = this.game;
    const iWon = g.winner === this.myIndex;
    const winnerName = g.players[g.winner].name;

    if (iWon) {
      showConfetti();
      SFX.victory();
    } else {
      SFX.defeat();
    }

    const myScore = getTotalScore(g, this.myIndex);
    const oppScore = getTotalScore(g, this.myIndex === 0 ? 1 : 0);

    this.app.innerHTML = `
      <div class="bg-pattern"></div>
      <div class="screen-gameover">
        <div class="gameover-container panel">
          <div class="gameover-crown">${iWon ? '👑' : '💔'}</div>
          <div class="gameover-title ${iWon ? 'winner' : 'loser'}">
            ${iWon ? '¡Victoria!' : 'Derrota'}
          </div>
          <div class="gameover-subtitle">
            ${iWon ? `¡${winnerName} ha conquistado el poder!` : `${winnerName} ha tomado el control de la nación.`}
          </div>

          <div class="gameover-stats">
            <div class="gameover-stat card">
              <div class="gs-label">Tus regiones</div>
              <div class="gs-value">${countRegions(g, this.myIndex)}</div>
            </div>
            <div class="gameover-stat card">
              <div class="gs-label">Regiones rival</div>
              <div class="gs-value">${countRegions(g, this.myIndex === 0 ? 1 : 0)}</div>
            </div>
            <div class="gameover-stat card">
              <div class="gs-label">Tu popularidad</div>
              <div class="gs-value">${g.players[this.myIndex].popularity}%</div>
            </div>
            <div class="gameover-stat card">
              <div class="gs-label">Tu dinero</div>
              <div class="gs-value">$${g.players[this.myIndex].money}</div>
            </div>
            <div class="gameover-stat card">
              <div class="gs-label">Tu puntuación</div>
              <div class="gs-value">${myScore}</div>
            </div>
            <div class="gameover-stat card">
              <div class="gs-label">Puntuación rival</div>
              <div class="gs-value">${oppScore}</div>
            </div>
          </div>

          <div style="display:flex; gap:12px; justify-content:center; margin-top:16px;">
            <button class="btn btn-primary btn-lg" id="btnPlayAgain">🔄 Jugar de Nuevo</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnPlayAgain')?.addEventListener('click', () => {
      SFX.click();
      this.network.destroy();
      this.game = null;
      this.selectedRegion = null;
      this.opponentName = '';
      this.chatMessages = [];
      this.unreadChat = 0;
      this.renderMenu();
    });
  }
}
