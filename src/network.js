/**
 * PODER & GLORIA — P2P Network Layer (PeerJS)
 * Handles creating/joining rooms and syncing game state in real-time.
 */
import { Peer } from 'peerjs';

const PEER_PREFIX = 'podergloria-';

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

  /** Create a room (host) */
  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomCode = this._generateCode();
      this.isHost = true;
      const peerId = PEER_PREFIX + this.roomCode;

      this.peer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        console.log('[Network] Host room created:', this.roomCode);
        resolve(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('[Network] Peer connected:', conn.peer);
        this.conn = conn;
        this._setupConnection(conn);
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

      this.peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        console.log('[Network] Connecting to host:', hostId);
        const conn = this.peer.connect(hostId, { reliable: true });
        this.conn = conn;

        conn.on('open', () => {
          console.log('[Network] Connected to host!');
          this._setupConnection(conn);
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

  _setupConnection(conn) {
    conn.on('data', (data) => {
      if (data.type === 'handshake' && this.onConnected) {
        this.onConnected(data.name);
      }
      if (this.onData) {
        this.onData(data);
      }
    });

    conn.on('close', () => {
      console.log('[Network] Connection closed');
      if (this.onDisconnect) this.onDisconnect();
    });
  }

  /** Send data to the other player */
  send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
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
  sendAction(actionId, regionId) {
    this.send({ type: 'action', actionId, regionId });
  }

  /** Send end turn */
  sendEndTurn() {
    this.send({ type: 'endTurn' });
  }

  /** Send game start signal */
  sendStart(state) {
    this.send({ type: 'start', state: JSON.parse(JSON.stringify(state)) });
  }

  /** Send a chat message */
  sendChat(message) {
    this.send({ type: 'chat', message, timestamp: Date.now() });
  }

  /** Send surrender */
  sendSurrender() {
    this.send({ type: 'surrender' });
  }

  /** Destroy connection */
  destroy() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
    this.conn = null;
    this.peer = null;
  }
}
