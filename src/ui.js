/**
 * PODER & GLORIA — UI Renderer
 * All DOM rendering and user interaction logic.
 * Features: Chat, Sound FX, Surrender, Victory Progress Bar
 */
import {
  createGameState, getActions, performAction, processRoundEnd, canAfford,
  getRegionOwner, countRegions, getMaxRounds, getActionsPerTurn, getTotalScore,
  determineWinner, getActionCost, sendProposal, respondToProposal,
  REGIMES, LAWS, setRegime, passLaw
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

// ===== Trade Modal =====
function showTradeCreateModal(onSend) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content panel" style="animation: fadeSlideUp 0.4s ease forwards; min-width:320px; border: 2px solid var(--gold);">
      <h3>🤝 Propuesta Bilateral</h3>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:0.75rem; color:var(--text-dim); text-align:left;">Tipo de Acuerdo</label>
        <select id="tradeType" class="input" style="width:100%;">
          <option value="TRADE">Acuerdo Comercial</option>
          <option value="PEACE">Tratado de Paz (3 Turnos)</option>
        </select>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div>
          <label style="display:block; font-size:0.7rem; color:var(--text-dim); text-align:left; margin-bottom:4px;">LO QUE OFRECES</label>
          <input id="tradeOfferMoney" class="input" type="number" placeholder="$ Dólares" style="margin-bottom:8px; font-size:0.8rem;" />
          <input id="tradeOfferRes" class="input" type="number" placeholder="📦 Material" style="font-size:0.8rem;" />
        </div>
        <div>
          <label style="display:block; font-size:0.7rem; color:var(--text-dim); text-align:left; margin-bottom:4px;">LO QUE DEMANDAS</label>
          <input id="tradeDemandMoney" class="input" type="number" placeholder="$ Dólares" style="margin-bottom:8px; font-size:0.8rem;" />
          <input id="tradeDemandRes" class="input" type="number" placeholder="📦 Material" style="font-size:0.8rem;" />
        </div>
      </div>

      <div class="modal-actions" style="margin-top:20px;">
        <button class="btn btn-primary" id="btnSendProposal">Emitir Orden</button>
        <button class="btn" id="btnCancelProposal">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('btnSendProposal').addEventListener('click', () => {
    const proposal = {
      type: document.getElementById('tradeType').value,
      offer: { 
        money: parseInt(document.getElementById('tradeOfferMoney').value) || 0,
        resources: parseInt(document.getElementById('tradeOfferRes').value) || 0
      },
      demand: {
        money: parseInt(document.getElementById('tradeDemandMoney').value) || 0,
        resources: parseInt(document.getElementById('tradeDemandRes').value) || 0
      }
    };
    overlay.remove();
    if (onSend) onSend(proposal);
  });
  
  document.getElementById('btnCancelProposal').addEventListener('click', () => {
    overlay.remove();
  });
}

// ===== Laws & Regime Modals =====
function showLawsSelectorModal(game, playerIndex, onPass) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const myLaws = game.players[playerIndex].activeLaws;
  
  overlay.innerHTML = `
    <div class="modal-content panel" style="animation: fadeSlideUp 0.4s ease forwards; width:450px;">
      <h3>⚖️ Agenda Legislativa</h3>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:15px; text-align:left;">
        ${LAWS.map(law => {
          const active = myLaws.includes(law.id);
          const afford = game.players[playerIndex].money >= (law.cost.money||0) && game.players[playerIndex].popularity >= (law.cost.popularity||0);
          return `
            <div class="card" style="padding:10px; background: rgba(255,255,255,0.03); border: 1px solid ${active ? 'var(--gold)' : 'var(--border)'}; opacity: ${active ? '0.6' : '1'};">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="color:var(--gold);">${law.name}</strong>
                ${active ? '<span style="font-size:0.7rem; color:var(--gold);">ACTIVA</span>' : `<button class="btn btn-xs btn-primary btn-pass-law" data-id="${law.id}" ${!afford ? 'disabled' : ''}>Promulgar</button>`}
              </div>
              <div style="font-size:0.75rem; color:var(--text-dim); margin:4px 0;">${law.desc}</div>
              <div style="font-size:0.7rem; color:var(--gold-dim);">Costo: ${law.cost.money ? `$${law.cost.money}` : ''} ${law.cost.popularity ? `${law.cost.popularity}⭐` : ''}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="modal-actions" style="margin-top:20px;">
        <button class="btn" id="btnCloseLaws">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  overlay.querySelectorAll('.btn-pass-law').forEach(btn => {
    btn.addEventListener('click', () => {
      onPass(btn.dataset.id);
      overlay.remove();
    });
  });
  document.getElementById('btnCloseLaws').addEventListener('click', () => overlay.remove());
}

function showRegimeSelectorModal(currentRegime, onSelect) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content panel" style="animation: fadeSlideUp 0.4s ease forwards; width:400px;">
      <h3>🏛️ Reforma del Sistema de Gobierno</h3>
      <p style="font-size:0.8rem; color:var(--text-dim); margin-bottom:15px;">Cambiar de régimen cuesta <strong>30% de Reputación</strong> debido a la inestabilidad política.</p>
      <div style="display:grid; grid-template-columns:1fr; gap:10px;">
        ${Object.values(REGIMES).map(reg => {
          const isCurrent = currentRegime === reg.id;
          return `
            <div class="card ${isCurrent ? 'selected' : ''}" style="padding:12px; cursor:pointer;" id="regime-${reg.id}">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size:2rem;">${reg.icon}</div>
                <div style="text-align:left;">
                  <div style="font-weight:bold; color:var(--gold);">${reg.name}</div>
                  <div style="font-size:0.7rem; color:var(--text-dim);">${reg.desc}</div>
                  <div style="font-size:0.7rem; color:var(--green); margin-top:3px;">Extra: ${reg.bonus}</div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="modal-actions" style="margin-top:20px;">
        <button class="btn" id="btnCancelRegime">Mantener Actual</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  Object.values(REGIMES).forEach(reg => {
    document.getElementById(`regime-${reg.id}`).addEventListener('click', () => {
      onSelect(reg.id);
      overlay.remove();
    });
  });
  document.getElementById('btnCancelRegime').addEventListener('click', () => overlay.remove());
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
      const logEntry = performAction(this.game, data.actionId, data.regionId, data.p);
      if (logEntry) {
        this.renderGame();
        showToast(logEntry.message, 'warning');
      }
    }
    if (data.type === 'ready') {
      this.game.ready[data.p] = true;
      if (this.game.ready[0] && this.game.ready[1]) {
        processRoundEnd(this.game);
        showToast('Siguiente Turno iniciado', 'info');
        if (this.game.gameOver) {
          this.renderGameOver();
        } else if (this.game.lastEvent) {
          showEventModal(this.game.lastEvent, () => {
            this.renderGame();
          });
          this.game.lastEvent = null;
        }
      } else {
        showToast('El rival ha terminado sus operaciones.', 'info');
      }
      this.renderGame();
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
    if (data.type === 'proposal') {
      this.game.proposals.push(data.proposal);
      this.renderGame();
      showToast('📩 Nueva propuesta diplomática!', 'gold');
    }
    if (data.type === 'proposalResponse') {
      respondToProposal(this.game, data.proposalId, data.accepted);
      this.renderGame();
      showToast(`🤝 Propuesta ${data.accepted ? 'ACEPTADA' : 'RECHAZADA'}`, data.accepted ? 'success' : 'error');
    }
    if (data.type === 'law') {
      passLaw(this.game, data.p, data.lawId);
      this.renderGame();
    }
    if (data.type === 'regime') {
      setRegime(this.game, data.p, data.regimeId);
      this.renderGame();
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
    const isMyTurn = true;
    const iAmReady = g.ready[this.myIndex];
    const myFaction = 'all';
    const actions = getActions();
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
            <div class="topbar-title">OPERACIONES GLOBALES</div>
          </div>
          <div class="topbar-center">
            <div class="progress-war reputation-bar" style="max-width: 500px; margin: 0 auto; min-width: 300px;">
              <div class="pw-label pw-label-left" style="font-weight:800; font-size:0.9rem; color: #fff; text-shadow: 0 0 10px var(--gold); display: flex; justify-content: space-between;">
                <span style="color:${me.color === 'blue' ? 'var(--blue-light)' : 'var(--red-light)'}">${me.name.toUpperCase()}: ${me.popularity}%</span>
                <span style="color:var(--text-dim)">|</span>
                <span style="color:${opp.color === 'red' ? 'var(--red-light)' : 'var(--blue-light)'}">${opp.popularity}% :${opp.name.toUpperCase()}</span>
              </div>
              <div class="pw-bar" style="background: rgba(0,0,0,0.6); border: 1px solid var(--border); border-radius: 6px; height: 16px; display: flex; overflow: hidden;">
                <div class="pw-fill-left" style="width:${me.popularity / ((me.popularity + opp.popularity)||1) * 100}%; background: ${me.color === 'blue' ? 'var(--blue)' : 'var(--red)'}; transition: all 0.5s;"></div>
                <div class="pw-fill-right" style="width:${opp.popularity / ((me.popularity + opp.popularity)||1) * 100}%; background: ${opp.color === 'red' ? 'var(--red)' : 'var(--blue)'}; transition: all 0.5s;"></div>
              </div>
              <div class="pw-label pw-label-right" style="color:var(--text-dim); font-size:0.75rem; margin-top:2px; text-align:center;">
                Tensión Geopolítica Mundial
              </div>
            </div>
          </div>
          <div class="topbar-right">
            <div class="turn-badge ${iAmReady ? 'not-my-turn' : 'my-turn'}">
              ${iAmReady ? '⏳ Esperando Rival' : '🎯 Fase de Operaciones'}
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
                <div class="stat-label"><span class="stat-icon">📈</span> Inflación</div>
                <div class="stat-value" style="color: ${me.inflation > 20 ? 'var(--red-light)' : 'var(--text)'};">${me.inflation}%</div>
              </div>
              <div class="stat-card card">
                <div class="stat-label"><span class="stat-icon">💼</span> Corrupción</div>
                <div class="stat-value" style="color: ${me.corruption > 25 ? 'var(--red-light)' : 'var(--text)'};">${Math.floor(me.corruption)}%</div>
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
                <div class="stat-value" style="color: ${g.actionsLeft[this.myIndex] > 0 ? 'var(--gold-light)' : 'var(--text-muted)'};">${g.actionsLeft[this.myIndex]}</div>
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
                <span class="opp-label">📈 Inflación</span>
                <span>${opp.inflation}%</span>
              </div>
              <div class="opponent-mini-stat">
                <span class="opp-label">💼 Corrupción</span>
                <span>${Math.floor(opp.corruption)}%</span>
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

            <!-- CABINET PANEL -->
            <div class="panel cabinet-panel card" style="margin-top:12px; border:1px solid rgba(255,255,255,0.05); background: rgba(20,25,35,0.6);">
              <div class="panel-header" style="font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05); padding:6px; color:var(--text-dim); display:flex; justify-content:space-between;">
                <span>⚖️ GABINETE DE GOBIERNO</span>
                <span style="color:var(--gold); font-weight:bold;">${REGIMES[me.regime].icon} ${REGIMES[me.regime].name.toUpperCase()}</span>
              </div>
              <div style="padding:10px;">
                <div style="font-size:0.7rem; color:var(--text-dim); margin-bottom: 8px;">
                   <strong>Leyes Activas:</strong> ${me.activeLaws.length ? me.activeLaws.map(id => LAWS.find(l=>l.id===id).name).join(', ') : 'Ninguna'}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                  <button class="btn btn-xs btn-outline" id="btnLaws" style="font-size:0.65rem;">⚖️ Promulgar Ley</button>
                  <button class="btn btn-xs btn-outline" id="btnRegime" style="font-size:0.65rem;">🏛️ Cambiar Régimen</button>
                </div>
              </div>
            </div>

            <!-- DIPLOMACY PANEL -->
            <div class="panel diplomacy-panel card" style="margin-top:12px; border:1px solid rgba(255,255,255,0.05); background: rgba(10,15,20,0.4);">
              <div class="panel-header" style="font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.05); padding:6px; color:var(--text-dim);">🤝 DIPLOMACIA E INTERCAMBIO</div>
              <div class="proposals-list" style="padding:8px; display:flex; flex-direction:column; gap:8px;">
                ${this._renderProposals(g)}
              </div>
              <button class="btn btn-sm btn-outline" id="btnOpenTrade" style="width:100%; border-top:1px solid rgba(255,255,255,0.05);">Crear Oferta Bilateral</button>
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
                ${(function(){
                  const MAP_LAYOUT = {
                    capital: {x: 50, y: 45}, norte_lejano: {x: 50, y: 5}, norte: {x: 50, y: 20}, frontera_norte: {x: 75, y: 25}, desierto_norte: {x: 25, y: 25},
                    costa: {x: 15, y: 45}, industrial: {x: 80, y: 45}, delta: {x: 30, y: 65}, selva: {x: 70, y: 65}, sur: {x: 50, y: 80},
                    islas_lejanas: {x: 15, y: 80}, archipielago: {x: 25, y: 95}, estepa: {x: 85, y: 85}, meseta: {x: 15, y: 10},
                    ruinas: {x: 85, y: 10}, yacimiento: {x: 50, y: 60}
                  };
                  const MAP_EDGES = [
                    ['norte_lejano','norte'], ['norte_lejano','meseta'], ['norte_lejano','ruinas'],
                    ['norte','capital'], ['norte','frontera_norte'], ['norte','desierto_norte'],
                    ['desierto_norte','costa'], ['desierto_norte','meseta'],
                    ['frontera_norte','industrial'], ['frontera_norte','ruinas'],
                    ['costa','delta'], ['capital','costa'], ['capital','industrial'], ['capital','yacimiento'],
                    ['industrial','selva'], ['yacimiento','delta'], ['yacimiento','selva'], ['yacimiento','sur'],
                    ['delta','islas_lejanas'], ['selva','estepa'], ['sur','delta'], ['sur','selva'], 
                    ['sur','archipielago'], ['sur','estepa'], ['islas_lejanas','archipielago']
                  ];
                  return MAP_EDGES.map(e => {
                    const n1 = MAP_LAYOUT[e[0]];
                    const n2 = MAP_LAYOUT[e[1]];
                    if(!n1 || !n2) return '';
                    return `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="rgba(255,255,255,0.15)" stroke-width="0.3" stroke-dasharray="1,1"/>`;
                  }).join('');
                })()}
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
            <div class="actions-title">⚡ Políticas (${g.actionsLeft[this.myIndex]} restantes)</div>
            ${actions.map(a => {
              const needsRegion = a.needsRegion;
              const affordable = canAfford(g, a.id, this.myIndex) && g.actionsLeft[this.myIndex] > 0;
              const regionSelected = !needsRegion || this.selectedRegion;
              const disabled = !affordable || !regionSelected || (a.id === 'combat' && g.peaceDuration > 0) || iAmReady;
              
              const currentCost = getActionCost(g, a.id, this.myIndex);
              let costStr = [];
              if(currentCost.money) costStr.push(`$${currentCost.money}`);
              if(currentCost.resources) costStr.push(`${currentCost.resources}📡`);
              if(currentCost.military) costStr.push(`${currentCost.military}🪖`);
              if(currentCost.popularity) costStr.push(`${currentCost.popularity}⭐`);
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
                        ${a.desc}${needsRegion && !this.selectedRegion && !iAmReady ? '<br/><em style="color:var(--gold); font-weight:bold;">📍 REQUIERE SELECCIÓN</em>' : ''}
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
              <button class="btn btn-primary" id="btnReady" style="width:100%;" ${iAmReady ? 'disabled' : ''}>
                ${iAmReady ? '⏳ Esperando Rival...' : '✅ Terminar Operaciones'}
              </button>
              <button class="btn btn-danger btn-sm" id="btnSurrender" style="width:100%; margin-top:8px;">
                🏳️ Rendirse
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnOpenTrade')?.addEventListener('click', () => {
      this._showTradeModal();
    });

    document.getElementById('btnLaws')?.addEventListener('click', () => {
      this._showLawsModal();
    });

    document.getElementById('btnRegime')?.addEventListener('click', () => {
      this._showRegimeModal();
    });

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

    this.app.querySelectorAll('.btn-accept-proposal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const result = respondToProposal(this.game, id, true);
        if (result) {
          this.network.send({ type: 'proposalResponse', proposalId: id, accepted: true });
          this.renderGame();
          showToast('Acuerdo establecido!', 'success');
        }
      });
    });

    this.app.querySelectorAll('.btn-reject-proposal').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        respondToProposal(this.game, id, false);
        this.network.send({ type: 'proposalResponse', proposalId: id, accepted: false });
        this.renderGame();
      });
    });

    document.getElementById('btnReady')?.addEventListener('click', () => {
      if (this.game.ready[this.myIndex]) return;
      SFX.click();
      this.game.ready[this.myIndex] = true;
      this.network.sendReady(this.myIndex);
      
      if (this.game.ready[0] && this.game.ready[1]) {
        processRoundEnd(this.game);
        if (this.game.gameOver) {
          this.renderGameOver();
          return;
        } else {
          showToast('Siguiente Turno iniciado', 'info');
          if (this.game.lastEvent) {
             showEventModal(this.game.lastEvent, () => this.renderGame());
             this.game.lastEvent = null;
          }
        }
      }
      this.renderGame();
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
    const MAP_LAYOUT = {
      capital: {x: 50, y: 45}, norte_lejano: {x: 50, y: 5}, norte: {x: 50, y: 20}, frontera_norte: {x: 75, y: 25}, desierto_norte: {x: 25, y: 25},
      costa: {x: 15, y: 45}, industrial: {x: 80, y: 45}, delta: {x: 30, y: 65}, selva: {x: 70, y: 65}, sur: {x: 50, y: 80},
      islas_lejanas: {x: 15, y: 80}, archipielago: {x: 25, y: 95}, estepa: {x: 85, y: 85}, meseta: {x: 15, y: 10},
      ruinas: {x: 85, y: 10}, yacimiento: {x: 50, y: 60}
    };
    const c = MAP_LAYOUT[region.id] || {x:50, y:50};
    const inlineStyle = `top: ${c.y}%; left: ${c.x}%;`;

    const owner = getRegionOwner(region);
    const ownerClass = owner === 0 ? 'player-0' : owner === 1 ? 'player-1' : 'neutral';
    const selected = this.selectedRegion === region.id ? 'selected' : '';
    const total = (region.influence[0] || 0) + (region.influence[1] || 0);
    const p0w = total > 0 ? (region.influence[0] / Math.max(total, 1)) * 100 : 0;
    const p1w = total > 0 ? (region.influence[1] / Math.max(total, 1)) * 100 : 0;

    const oppIdx = this.myIndex === 0 ? 1 : 0;
    const hasEnemyTroops = (region.troops[oppIdx] || 0) > 0;
    const myTroops = (region.troops[this.myIndex] || 0) > 0;
    const isStable = region.influence[this.myIndex] === 100 && !hasEnemyTroops;
    const hasConflict = myTroops && hasEnemyTroops;

    return `
      <div class="region-node ${ownerClass} ${selected}" data-region="${region.id}" style="${inlineStyle}; ${hasConflict ? 'filter: drop-shadow(0 0 10px var(--red));' : ''}">
        <div class="node-influence-ring" style="background: conic-gradient(var(--blue) 0% ${p0w}%, var(--red) ${p0w}% ${p0w + p1w}%, rgba(20,25,30,0.8) ${p0w + p1w}% 100%);"></div>
        <div class="node-inner" style="${isStable ? `background-color: ${this.myIndex === 0 ? 'var(--blue)' : 'var(--red)'};` : ''}">
          <div class="node-icon">${region.icon}</div>
        </div>
        ${hasConflict ? `<div class="insurgent-warning" style="position:absolute; top:-30px; font-size:1.5rem; text-shadow:0 0 10px #f00;">⚔️</div>` : ''}
        <div class="troops-bubbles">
          ${region.troops && region.troops[0] > 0 ? `<div class="troop-bubble player-0">🛡️ ${region.troops[0]}</div>` : ''}
          ${region.troops && region.troops[1] > 0 ? `<div class="troop-bubble player-1">🛡️ ${region.troops[1]}</div>` : ''}
        </div>
        <div class="node-labels">
          <div class="node-name" style="${isStable ? `color: ${this.myIndex === 0 ? 'var(--blue-light)' : 'var(--red-light)'};` : ''}">${region.name} <span style="opacity:0.6">(${region.population}M)</span></div>
          <div class="node-inf-text">Fed: ${region.influence[0]}% | Ali: ${region.influence[1]}%</div>
        </div>
      </div>
    `;
  }

  _showLawsModal() {
    showLawsSelectorModal(this.game, this.myIndex, (lawId) => {
      if (passLaw(this.game, this.myIndex, lawId)) {
        this.network.send({ type: 'law', p: this.myIndex, lawId });
        this.renderGame();
        showToast('Ley promulgada con éxito', 'success');
      }
    });
  }

  _showRegimeModal() {
    showRegimeSelectorModal(this.game.players[this.myIndex].regime, (regimeId) => {
      if (setRegime(this.game, this.myIndex, regimeId)) {
        this.network.send({ type: 'regime', p: this.myIndex, regimeId });
        this.renderGame();
        showToast(`Régimen cambiado a ${REGIMES[regimeId].name}`, 'warning');
      }
    });
  }

  _renderProposals(game) {
    const list = game.proposals.filter(p => p.to === this.myIndex);
    if (list.length === 0) return `<div style="font-size:0.7rem; color:var(--text-dim); font-style:italic; text-align:center;">No hay comunicaciones diplomáticas entrantes.</div>`;
    
    return list.map(p => {
       return `
         <div class="proposal-card card" style="background: rgba(46, 204, 113, 0.05); border: 1px solid var(--border); padding: 8px; font-size: 0.75rem; border-left: 3px solid var(--gold);">
           <div style="font-weight:bold; color:var(--gold); margin-bottom:4px;">${p.type === 'PEACE' ? '🕊️ TRATADO DE PAZ' : '🚢 ACUERDO COMERCIAL'}</div>
           <div style="color:var(--text-dim);">Ofrece: <span style="color:#fff;">${p.offer.money ? `$${p.offer.money}` : ''} ${p.offer.resources ? `${p.offer.resources}📦` : ''}</span></div>
           <div style="color:var(--text-dim);">Demanda: <span style="color:#fff;">${p.demand.money ? `$${p.demand.money}` : ''} ${p.demand.resources ? `${p.demand.resources}📦` : ''}</span></div>
           <div style="display:flex; gap:6px; margin-top:8px;">
             <button class="btn btn-xs btn-primary btn-accept-proposal" data-id="${p.id}" style="flex:1; padding:4px 0;">ACEPTAR</button>
             <button class="btn btn-xs btn-reject-proposal" data-id="${p.id}" style="flex:1; padding:4px 0; background:rgba(255,255,255,0.05);">RECHAZAR</button>
           </div>
         </div>
       `;
    }).join('');
  }

  _showTradeModal() {
    showTradeCreateModal((proposal) => {
        const p = sendProposal(this.game, this.myIndex, proposal.type, proposal.offer, proposal.demand);
        this.network.send({ type: 'proposal', proposal: p });
        showToast('Propuesta diplomática enviada.', 'info');
        this.renderGame();
    });
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

    const logEntry = performAction(this.game, actionId, regionId, this.myIndex);
    if (logEntry) {
      SFX.action();
      this.network.sendAction(actionId, regionId, this.myIndex);
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
