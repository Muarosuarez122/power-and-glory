/**
 * PODER & GLORIA — P2P Network Layer (PeerJS)
 * Handles creating/joining rooms and syncing game state in real-time.
 * Uses the FREE PeerJS Cloud Broker for global internet connectivity.
 * Supports cross-play between Electron EXE and Web Browser.
 */
import { Peer } from 'peerjs';

const PEER_PREFIX = 'podergloria-v2-';

export class Network {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.roomCode = '';
    this.onConnected = null;   // callback(peerName)
    this.onData = null;        // callback(data)
    this.onDisconnect = null;  // callback()
    this.onError = null;       // callback(err)
    this._pingInterval = null;
    this._connected = false;
  }

  /** Generate a random 5-char code */
  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /** PeerJS config — always uses the FREE cloud broker for global reach */
  _getPeerConfig() {
    return {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ]
      }
    };
  }

  /** Create a room (host) */
  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this._generateCode();
      this.isHost = true;
      const peerId = PEER_PREFIX + this.roomCode;

      this.peer = new Peer(peerId, this._getPeerConfig());

      this.peer.on('open', (id) => {
        console.log('[Network] Host room created, peer ID:', id);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('[Network] Guest peer connected:', conn.peer);
        this.conn = conn;
        this._wireConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[Network] Host error:', err);
        if (this.onError) this.onError(err);
        reject(err);
      });
    });
  }

  /** Join a room (guest) */
  joinRoom(code) {
    return new Promise((resolve, reject) => {
      this.roomCode = code.toUpperCase().trim();
      this.isHost = false;
      const hostId = PEER_PREFIX + this.roomCode;

      this.peer = new Peer(this._getPeerConfig());

      this.peer.on('open', (myId) => {
        console.log('[Network] My peer ID:', myId, '-> connecting to host:', hostId);
        const conn = this.peer.connect(hostId, { reliable: true, serialization: 'json' });
        this.conn = conn;

        conn.on('open', () => {
          console.log('[Network] Channel open to host!');
          this._wireConnection(conn);
          this._connected = true;
          resolve();
        });

        conn.on('error', (err) => {
          console.error('[Network] Connection error:', err);
          if (this.onError) this.onError(err);
          reject(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('[Network] Join error:', err);
        if (this.onError) this.onError(err);
        reject(err);
      });
    });
  }

  /** Wire up a data connection with heartbeat and message routing */
  _wireConnection(conn) {
    // Heartbeat — keeps WebRTC alive through NAT/firewalls
    this._pingInterval = setInterval(() => {
      if (this.conn && this.conn.open) {
        try { this.conn.send({ type: '_ping' }); } catch(e) {}
      }
    }, 10000);

    conn.on('data', (data) => {
      // Silently ignore heartbeats
      if (!data || data.type === '_ping') return;

      console.log('[Network] Received:', data.type);

      // Route handshake to dedicated callback
      if (data.type === 'handshake' && this.onConnected) {
        this.onConnected(data.name);
      }

      // Route ALL messages to onData (including handshake so UI can handle it too)
      if (this.onData) {
        this.onData(data);
      }
    });

    conn.on('close', () => {
      console.log('[Network] Connection closed');
      this._cleanup();
      if (this.onDisconnect) this.onDisconnect();
    });

    conn.on('error', (err) => {
      console.error('[Network] Connection runtime error:', err);
    });

    this._connected = true;
  }

  /** Send data to the other player */
  send(data) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(data);
      } catch(e) {
        console.error('[Network] Send failed:', e);
      }
    } else {
      console.warn('[Network] Cannot send — connection not open');
    }
  }

  /** Send a handshake with player name */
  sendHandshake(name) {
    this.send({ type: 'handshake', name });
  }

  /** Send the full game state */
  sendGameState(state) {
    this.send({ type: 'gameState', state: JSON.parse(JSON.stringify(state)) });
  }

  /** Send an action */
  sendAction(actionId, regionId, playerIndex) {
    this.send({ type: 'action', actionId, regionId, p: playerIndex });
  }

  /** Send ready signal for simultaneous turn */
  sendReady(playerIndex) {
    this.send({ type: 'ready', p: playerIndex });
  }

  /** Send game start signal — immediate, no delay */
  sendStart(state) {
    const cleanState = JSON.parse(JSON.stringify(state));
    console.log('[Network] Sending START signal with full game state');
    this.send({ type: 'start', state: cleanState });
  }

  /** Send a chat message */
  sendChat(message) {
    this.send({ type: 'chat', message, timestamp: Date.now() });
  }

  /** Send surrender */
  sendSurrender() {
    this.send({ type: 'surrender' });
  }

  /** Clean up intervals */
  _cleanup() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }

  /** Destroy connection */
  destroy() {
    this._cleanup();
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.conn = null;
    this.peer = null;
    this._connected = false;
  }
}
