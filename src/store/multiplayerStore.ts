// Multiplayer store - manages lobby, WebSocket signaling, and WebRTC P2P connections
import { create } from 'zustand';
import type {
  ConnectionState,
  PeerInfo,
  LobbyInfo,
  SignalingClientMessage,
  SignalingServerMessage,
  P2PClientMessage,
  P2PHostMessage,
  GameAction,
  UserLobbyEntry,
} from '@/types/multiplayer';
import { useAuthStore } from './authStore';
import { useGameStore, registerMultiplayerBridge, registerBroadcastCallback, DEFAULT_SETTINGS, createDefaultPlayers } from './gameStore';
import {
  createPeerConnection,
  createDataChannel,
  sendDataChannelMessage,
  parseDataChannelMessage,
  cleanupPeerConnection,
  CONNECTION_TIMEOUT_MS,
} from '@/utils/webrtc';
import { generateSessionName } from '@/utils/nameGenerator';

const API_BASE = import.meta.env.PROD ? '' : '';
const WS_BASE = window.location.protocol === 'https:'
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`;

// Peer connection with data channel
interface PeerConnection {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  odPeerId: string;
  name: string;
  picture?: string;
}

interface MultiplayerState {
  // Connection state
  connectionState: ConnectionState;
  signalingWs: WebSocket | null;
  myPeerId: string | null;

  // Lobby info
  lobbyCode: string | null;
  lobbyInfo: LobbyInfo | null;
  isHost: boolean;
  guestToken: string | null;

  // WebRTC connections
  peerConnections: Map<string, PeerConnection>;
  hostConnection: PeerConnection | null; // Client's connection to host

  // Connected peers (tracked by host)
  connectedPeers: PeerInfo[];

  // Game state
  gameStarted: boolean;

  // User's lobbies (cached)
  myLobbies: UserLobbyEntry[];
  isLoadingLobbies: boolean;

  // Error
  error: string | null;
}

interface MultiplayerActions {
  // Lobby management
  createLobby: (existingSessionId?: string) => Promise<string>;
  resumeLobby: (code: string) => Promise<void>;
  joinLobby: (code: string, token?: string) => Promise<void>;
  joinAsGuest: (code: string, displayName?: string) => Promise<void>;
  fetchMyLobbies: () => Promise<void>;
  suspendLobby: () => void;
  leaveLobby: () => void;
  deleteSession: (code: string) => void;
  createLocalSession: () => string;

  // Game control
  startGame: () => void;

  // P2P messaging
  sendToHost: (message: P2PClientMessage) => void;
  broadcastToClients: (message: P2PHostMessage) => void;
  sendGameAction: (action: GameAction) => void;

  // Internal
  handleSignalingMessage: (message: SignalingServerMessage) => void;
  handleP2PMessage: (odPeerId: string, message: P2PClientMessage | P2PHostMessage) => void;
  initiatePeerConnection: (odPeerId: string, peerName: string, peerPicture?: string) => Promise<void>;
  handleOffer: (fromId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (fromId: string, sdp: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (fromId: string, candidate: RTCIceCandidateInit) => Promise<void>;
  setConnectionState: (state: ConnectionState) => void;
  clearError: () => void;
  cleanup: () => void;
}

export type MultiplayerStore = MultiplayerState & MultiplayerActions;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let pingInterval: ReturnType<typeof setInterval> | null = null;

// Helper to remove a session from localStorage cache by id
function removeSessionFromCache(id: string): UserLobbyEntry[] {
  try {
    const stored = localStorage.getItem('lobbies');
    const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
    const updated = lobbies.filter(l => l.id !== id);
    localStorage.setItem('lobbies', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Helper to get a specific session from cache by id
function getCachedSession(id: string): UserLobbyEntry | undefined {
  try {
    const stored = localStorage.getItem('lobbies');
    const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
    return lobbies.find(l => l.id === id);
  } catch {
    return undefined;
  }
}

// Helper to get a session by lobbyCode (for multiplayer resume)
function getCachedSessionByLobbyCode(lobbyCode: string): UserLobbyEntry | undefined {
  try {
    const stored = localStorage.getItem('lobbies');
    const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
    return lobbies.find(l => l.lobbyCode === lobbyCode);
  } catch {
    return undefined;
  }
}

// Helper to update a session in cache by id
function updateSessionCache(id: string, updates: Partial<UserLobbyEntry>): UserLobbyEntry[] {
  try {
    const stored = localStorage.getItem('lobbies');
    const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
    const updated = lobbies.map(l =>
      l.id === id ? { ...l, ...updates } : l
    );
    localStorage.setItem('lobbies', JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export const useMultiplayerStore = create<MultiplayerStore>()((set, get) => ({
  // Initial state
  connectionState: 'disconnected',
  signalingWs: null,
  myPeerId: null,
  lobbyCode: null,
  lobbyInfo: null,
  isHost: false,
  guestToken: null,
  peerConnections: new Map(),
  hostConnection: null,
  connectedPeers: [],
  gameStarted: false,
  myLobbies: [],
  isLoadingLobbies: false,
  error: null,

  // Actions
  createLobby: async (existingSessionId?: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      throw new Error('Must be signed in to create a lobby');
    }

    set({ error: null });

    try {
      const response = await fetch(`${API_BASE}/api/lobby/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create lobby');
      }

      const { lobbyCode } = await response.json();
      const gameStore = useGameStore.getState();

      set({ isHost: true });

      if (existingSessionId) {
        // Hosting an existing session - keep current game state, just add lobbyCode
        gameStore.setCurrentSessionId(existingSessionId);
        const updated = updateSessionCache(existingSessionId, { lobbyCode });
        set({ myLobbies: updated });
      } else {
        // Creating a new lobby with fresh state
        const sessionId = crypto.randomUUID();
        const defaultPlayers = createDefaultPlayers();
        const defaultSettings = { ...DEFAULT_SETTINGS };

        gameStore.resetGame();
        gameStore.setCurrentSessionId(sessionId);

        // Save to localStorage with default state
        try {
          const stored = localStorage.getItem('lobbies');
          const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
          const newEntry: UserLobbyEntry = {
            id: sessionId,
            lobbyCode,
            name: generateSessionName(),
            createdAt: Date.now(),
            status: 'active',
            gameState: {
              players: defaultPlayers,
              settings: defaultSettings,
            },
          };
          // Add to front, limit to 10 entries
          const updated = [newEntry, ...lobbies.filter(l => l.id !== sessionId)].slice(0, 10);
          localStorage.setItem('lobbies', JSON.stringify(updated));
          set({ myLobbies: updated });
        } catch (err) {
          console.error('Failed to save lobby to localStorage:', err);
        }
      }

      // Connect to signaling server
      await get().joinLobby(lobbyCode);

      return lobbyCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create lobby';
      set({ error: message });
      throw err;
    }
  },

  resumeLobby: async (sessionId: string) => {
    const { token } = useAuthStore.getState();
    if (!token) {
      throw new Error('Must be signed in to resume a lobby');
    }

    // Find session by id
    const session = getCachedSession(sessionId);
    if (!session?.lobbyCode) {
      throw new Error('Session not found or was never hosted');
    }

    set({ error: null, isHost: true });

    // Set current session ID and restore saved game state
    const gameStore = useGameStore.getState();
    gameStore.setCurrentSessionId(sessionId);
    if (session.gameState) {
      gameStore.restoreState(session.gameState, sessionId);
    }

    try {
      await get().joinLobby(session.lobbyCode);
    } catch (err) {
      // Reset isHost on failure
      set({ isHost: false });
      throw err;
    }
  },

  joinLobby: async (code: string, tokenOverride?: string) => {
    const { token: authToken } = useAuthStore.getState();
    const { guestToken, signalingWs: existingWs } = get();
    const token = tokenOverride || authToken || guestToken;

    if (!token) {
      throw new Error('No token available');
    }

    // Cleanup existing connection
    if (existingWs) {
      get().cleanup();
    }

    const normalizedCode = code.toUpperCase().trim();

    set({
      connectionState: 'connecting',
      lobbyCode: normalizedCode,
      error: null,
    });

    try {
      const wsUrl = `${WS_BASE}/ws/lobby/${normalizedCode}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
        set({ connectionState: 'connected', signalingWs: ws, error: null });

        // Start ping interval for signaling connection
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'SIGNALING_PING' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (get().signalingWs !== ws) return;
        try {
          const message: SignalingServerMessage = JSON.parse(event.data);
          get().handleSignalingMessage(message);
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      ws.onclose = (event) => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }

        const { lobbyCode: currentCode, signalingWs: currentWs } = get();
        if (currentWs !== ws) return;

        if (!currentCode) {
          set({ connectionState: 'disconnected', signalingWs: null });
          return;
        }

        // Try to reconnect signaling
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          set({ connectionState: 'reconnecting' });
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          setTimeout(() => {
            reconnectAttempts++;
            get().joinLobby(currentCode).catch(console.error);
          }, delay);
        } else {
          get().cleanup();
          set({ error: event.code === 1000 ? null : 'Connection lost' });
          if (event.code !== 1000) {
            useGameStore.getState().setGameMode('menu');
          }
        }
      };

      ws.onerror = () => {
        const { connectionState, lobbyCode: currentCode } = get();
        if (connectionState !== 'reconnecting') {
          // Connection failed - lobby likely doesn't exist anymore
          // Find session by lobbyCode and remove from cache
          if (currentCode) {
            const session = getCachedSessionByLobbyCode(currentCode);
            if (session) {
              const updated = removeSessionFromCache(session.id);
              set({ error: 'Lobby not found', myLobbies: updated });
            } else {
              set({ error: 'Lobby not found' });
            }
          } else {
            set({ error: 'Connection error' });
          }
        }
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join lobby';
      set({
        connectionState: 'disconnected',
        lobbyCode: null,
        error: message,
      });
      throw err;
    }
  },

  joinAsGuest: async (code: string, displayName?: string) => {
    set({ error: null });

    try {
      const response = await fetch(`${API_BASE}/api/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, displayName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join lobby');
      }

      const { token } = await response.json();
      set({ guestToken: token });
      await get().joinLobby(code, token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join lobby';
      set({ error: message, guestToken: null });
      throw err;
    }
  },

  fetchMyLobbies: async () => {
    set({ isLoadingLobbies: true });

    try {
      const stored = localStorage.getItem('lobbies');
      const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
      set({ myLobbies: lobbies, isLoadingLobbies: false });
    } catch (err) {
      console.error('Failed to load lobbies from localStorage:', err);
      set({ myLobbies: [], isLoadingLobbies: false });
    }
  },

  suspendLobby: () => {
    const { signalingWs, peerConnections, hostConnection } = get();
    const gameStore = useGameStore.getState();
    const currentSessionId = gameStore.currentSessionId;

    // Save current game state to cache before suspending
    if (currentSessionId) {
      const updated = updateSessionCache(currentSessionId, {
        gameState: {
          players: gameStore.players,
          settings: gameStore.settings,
        },
      });
      set({ myLobbies: updated });
    }

    // Send suspend message to server before closing (host only)
    if (signalingWs?.readyState === WebSocket.OPEN) {
      signalingWs.send(JSON.stringify({ type: 'SIGNALING_HOST_SUSPEND' }));
    }

    // Close signaling WebSocket
    if (signalingWs) {
      signalingWs.onclose = null; // Prevent reconnect attempts
      signalingWs.onerror = null;
      signalingWs.onmessage = null;
      try {
        signalingWs.close(1000);
      } catch {
        // Ignore close errors
      }
    }

    // Close all peer connections
    peerConnections.forEach((peer) => {
      cleanupPeerConnection(peer.pc);
    });

    // Close host connection (if client)
    if (hostConnection) {
      cleanupPeerConnection(hostConnection.pc);
    }

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Partially reset state - keep lobbyCode and isHost for resume awareness
    set({
      connectionState: 'disconnected',
      signalingWs: null,
      peerConnections: new Map(),
      hostConnection: null,
      connectedPeers: [],
      gameStarted: false,
      error: null,
      // Keep: lobbyCode, lobbyInfo, isHost, myPeerId, guestToken
    });
  },

  leaveLobby: () => {
    const { isHost } = get();
    const gameStore = useGameStore.getState();
    const currentSessionId = gameStore.currentSessionId;

    // If host is closing the lobby, remove it from cache
    if (isHost && currentSessionId) {
      const updated = removeSessionFromCache(currentSessionId);
      set({ myLobbies: updated });
    }

    get().cleanup();
    gameStore.setGameMode('menu');
  },

  deleteSession: (id: string) => {
    const updated = removeSessionFromCache(id);
    set({ myLobbies: updated });
  },

  createLocalSession: () => {
    // Create fresh default state
    const defaultPlayers = createDefaultPlayers();
    const defaultSettings = { ...DEFAULT_SETTINGS };

    // Reset game to fresh state and set the current session ID
    const gameStore = useGameStore.getState();
    gameStore.resetGame();

    // Generate a UUID for the session
    const sessionId = crypto.randomUUID();
    gameStore.setCurrentSessionId(sessionId);

    // Save to localStorage with default state (no lobbyCode since this is local only)
    try {
      const stored = localStorage.getItem('lobbies');
      const lobbies: UserLobbyEntry[] = stored ? JSON.parse(stored) : [];
      const newEntry: UserLobbyEntry = {
        id: sessionId,
        // lobbyCode is not set - this session was never hosted
        name: generateSessionName(),
        createdAt: Date.now(),
        status: 'active',
        gameState: {
          players: defaultPlayers,
          settings: defaultSettings,
        },
      };
      // Add to front, limit to 10 entries
      const updated = [newEntry, ...lobbies].slice(0, 10);
      localStorage.setItem('lobbies', JSON.stringify(updated));
      set({ myLobbies: updated });
    } catch (err) {
      console.error('Failed to save local session to localStorage:', err);
    }

    return sessionId;
  },

  startGame: () => {
    const { isHost, peerConnections } = get();
    if (!isHost) return;

    const gameStore = useGameStore.getState();
    set({ gameStarted: true });

    // Broadcast game started to all clients
    const message: P2PHostMessage = {
      type: 'P2P_GAME_STARTED',
      payload: {
        players: gameStore.players,
        settings: gameStore.settings,
      },
    };
    get().broadcastToClients(message);
  },

  sendToHost: (message: P2PClientMessage) => {
    const { hostConnection, isHost } = get();
    if (isHost) {
      console.warn('Host should not send to host');
      return;
    }
    if (!hostConnection?.dc || hostConnection.dc.readyState !== 'open') {
      console.warn('No connection to host');
      return;
    }
    sendDataChannelMessage(hostConnection.dc, message);
  },

  broadcastToClients: (message: P2PHostMessage) => {
    const { isHost, peerConnections } = get();
    if (!isHost) {
      console.warn('Only host can broadcast');
      return;
    }

    peerConnections.forEach((peer) => {
      if (peer.dc?.readyState === 'open') {
        sendDataChannelMessage(peer.dc, message);
      }
    });
  },

  sendGameAction: (action: GameAction) => {
    const { isHost } = get();

    if (isHost) {
      // Action already applied locally by caller (updateCounter, etc.)
      // Just broadcast the updated state to clients
      const gameStore = useGameStore.getState();
      const message: P2PHostMessage = {
        type: 'P2P_STATE_SYNC',
        payload: {
          players: gameStore.players,
          settings: gameStore.settings,
          gameStarted: get().gameStarted,
          highrollMode: gameStore.highrollMode,
          timestamp: Date.now(),
        },
      };
      get().broadcastToClients(message);
    } else {
      // Client sends action to host
      get().sendToHost({
        type: 'P2P_ACTION',
        payload: { action },
      });
    }
  },

  handleSignalingMessage: (message: SignalingServerMessage) => {
    const gameStore = useGameStore.getState();

    switch (message.type) {
      case 'SIGNALING_JOINED':
        set({
          lobbyInfo: message.payload.lobbyInfo,
          myPeerId: message.payload.yourId,
          isHost: message.payload.isHost,
          connectedPeers: message.payload.lobbyInfo.peers,
        });
        break;

      case 'SIGNALING_PEER_JOINED':
        // Host: initiate WebRTC connection to new peer
        if (get().isHost) {
          get().initiatePeerConnection(
            message.payload.odPeerId,
            message.payload.peerName,
            message.payload.peerPicture
          );
        }
        break;

      case 'SIGNALING_PEER_LEFT':
        {
          const { peerConnections, isHost } = get();
          const peer = peerConnections.get(message.payload.odPeerId);
          if (peer) {
            cleanupPeerConnection(peer.pc);
            peerConnections.delete(message.payload.odPeerId);
            set({
              peerConnections: new Map(peerConnections),
              connectedPeers: get().connectedPeers.filter(p => p.odPeerId !== message.payload.odPeerId),
            });

            // Broadcast updated peer list to remaining clients
            if (isHost) {
              get().broadcastToClients({
                type: 'P2P_PEER_UPDATE',
                payload: { peers: get().connectedPeers },
              });
            }
          }
        }
        break;

      case 'SIGNALING_OFFER_RECEIVED':
        get().handleOffer(message.payload.fromId, message.payload.sdp);
        break;

      case 'SIGNALING_ANSWER_RECEIVED':
        get().handleAnswer(message.payload.fromId, message.payload.sdp);
        break;

      case 'SIGNALING_ICE_CANDIDATE_RECEIVED':
        get().handleIceCandidate(message.payload.fromId, message.payload.candidate);
        break;

      case 'SIGNALING_HOST_DISCONNECTED':
        // Host left - end session
        get().cleanup();
        set({ error: 'Host disconnected. Session ended.' });
        gameStore.setGameMode('menu');
        break;

      case 'SIGNALING_LOBBY_CLOSED':
        // Lobby forcibly closed (e.g., host started new session)
        get().cleanup();
        set({ error: message.payload.reason });
        gameStore.setGameMode('menu');
        break;

      case 'SIGNALING_PONG':
        // Keepalive response
        break;

      case 'SIGNALING_ERROR':
        set({ error: message.payload.message });
        break;
    }
  },

  handleP2PMessage: (odPeerId: string, message: P2PClientMessage | P2PHostMessage) => {
    const { isHost } = get();
    const gameStore = useGameStore.getState();

    if (isHost) {
      // Host receiving messages from clients
      const clientMsg = message as P2PClientMessage;
      switch (clientMsg.type) {
        case 'P2P_STATE_REQUEST':
          // Send current state to requesting client
          {
            const peer = get().peerConnections.get(odPeerId);
            if (peer?.dc?.readyState === 'open') {
              const stateMsg: P2PHostMessage = {
                type: 'P2P_STATE_SYNC',
                payload: {
                  players: gameStore.players,
                  settings: gameStore.settings,
                  gameStarted: get().gameStarted,
                  highrollMode: gameStore.highrollMode,
                  timestamp: Date.now(),
                },
              };
              sendDataChannelMessage(peer.dc, stateMsg);
            }
          }
          break;

        case 'P2P_ACTION':
          // Apply action and broadcast to all clients
          gameStore.applyGameAction(clientMsg.payload.action);
          break;

        case 'P2P_PING':
          {
            const peer = get().peerConnections.get(odPeerId);
            if (peer?.dc?.readyState === 'open') {
              sendDataChannelMessage(peer.dc, {
                type: 'P2P_PONG',
                payload: { timestamp: clientMsg.payload.timestamp },
              });
            }
          }
          break;

        case 'P2P_PONG':
          // Keepalive response from client
          break;
      }
    } else {
      // Client receiving messages from host
      const hostMsg = message as P2PHostMessage;
      switch (hostMsg.type) {
        case 'P2P_STATE_SYNC':
          gameStore.applyRemoteState(hostMsg.payload.players, hostMsg.payload.settings, hostMsg.payload.highrollMode);
          set({ gameStarted: hostMsg.payload.gameStarted });
          break;

        case 'P2P_GAME_STARTED':
          gameStore.applyRemoteState(hostMsg.payload.players, hostMsg.payload.settings);
          set({ gameStarted: true });
          break;

        case 'P2P_LOBBY_CLOSED':
          get().cleanup();
          set({ error: 'Host closed the lobby' });
          gameStore.setGameMode('menu');
          break;

        case 'P2P_PEER_UPDATE':
          set({ connectedPeers: hostMsg.payload.peers });
          break;

        case 'P2P_PING':
          get().sendToHost({
            type: 'P2P_PONG',
            payload: { timestamp: hostMsg.payload.timestamp },
          });
          break;

        case 'P2P_PONG':
          // Keepalive response from host
          break;
      }
    }
  },

  initiatePeerConnection: async (odPeerId: string, peerName: string, peerPicture?: string) => {
    const { signalingWs, peerConnections } = get();
    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) return;

    const pc = createPeerConnection();
    const dc = createDataChannel(pc);

    const peerConn: PeerConnection = {
      pc,
      dc,
      odPeerId,
      name: peerName,
      picture: peerPicture,
    };

    // Setup data channel handlers
    dc.onopen = () => {
      console.log(`DataChannel open with ${odPeerId}`);
      // Add to connected peers
      const newPeer: PeerInfo = {
        odPeerId,
        name: peerName,
        picture: peerPicture,
        isHost: false,
      };
      set((state) => ({
        connectedPeers: [...state.connectedPeers.filter(p => p.odPeerId !== odPeerId), newPeer],
      }));

      // Broadcast updated peer list
      get().broadcastToClients({
        type: 'P2P_PEER_UPDATE',
        payload: { peers: get().connectedPeers },
      });
    };

    dc.onmessage = (event) => {
      const msg = parseDataChannelMessage<P2PClientMessage>(event.data);
      if (msg) {
        get().handleP2PMessage(odPeerId, msg);
      }
    };

    dc.onclose = () => {
      console.log(`DataChannel closed with ${odPeerId}`);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingWs.readyState === WebSocket.OPEN) {
        const msg: SignalingClientMessage = {
          type: 'SIGNALING_ICE_CANDIDATE',
          payload: {
            targetId: odPeerId,
            candidate: event.candidate.toJSON(),
          },
        };
        signalingWs.send(JSON.stringify(msg));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`Connection ${pc.connectionState} with ${odPeerId}`);
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const offerMsg: SignalingClientMessage = {
      type: 'SIGNALING_OFFER',
      payload: {
        targetId: odPeerId,
        sdp: pc.localDescription!,
      },
    };
    signalingWs.send(JSON.stringify(offerMsg));

    peerConnections.set(odPeerId, peerConn);
    set({ peerConnections: new Map(peerConnections) });
  },

  handleOffer: async (fromId: string, sdp: RTCSessionDescriptionInit) => {
    const { signalingWs, isHost, lobbyInfo } = get();
    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) return;

    // Client receiving offer from host
    const pc = createPeerConnection();

    const peerConn: PeerConnection = {
      pc,
      dc: null,
      odPeerId: fromId,
      name: 'Host',
      picture: undefined,
    };

    // Handle incoming data channel (client side)
    pc.ondatachannel = (event) => {
      const dc = event.channel;
      peerConn.dc = dc;

      dc.onopen = () => {
        console.log('DataChannel open with host');
        set({ hostConnection: peerConn });

        // Request initial state from host
        get().sendToHost({ type: 'P2P_STATE_REQUEST' });
      };

      dc.onmessage = (msgEvent) => {
        const msg = parseDataChannelMessage<P2PHostMessage>(msgEvent.data);
        if (msg) {
          get().handleP2PMessage(fromId, msg);
        }
      };

      dc.onclose = () => {
        console.log('DataChannel closed with host');
        // Host disconnected via P2P
        get().cleanup();
        set({ error: 'Connection to host lost' });
        useGameStore.getState().setGameMode('menu');
      };
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingWs.readyState === WebSocket.OPEN) {
        const msg: SignalingClientMessage = {
          type: 'SIGNALING_ICE_CANDIDATE',
          payload: {
            targetId: fromId,
            candidate: event.candidate.toJSON(),
          },
        };
        signalingWs.send(JSON.stringify(msg));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`Connection ${pc.connectionState} with host`);
        // Handle connection loss to host
        if (pc.connectionState === 'failed') {
          get().cleanup();
          set({ error: 'Connection to host failed' });
          useGameStore.getState().setGameMode('menu');
        }
      }
    };

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const answerMsg: SignalingClientMessage = {
      type: 'SIGNALING_ANSWER',
      payload: {
        targetId: fromId,
        sdp: pc.localDescription!,
      },
    };
    signalingWs.send(JSON.stringify(answerMsg));

    // Store connection (client stores as hostConnection will be set when DC opens)
    if (!isHost) {
      // Temporarily store in peerConnections until DC opens
      const { peerConnections } = get();
      peerConnections.set(fromId, peerConn);
      set({ peerConnections: new Map(peerConnections) });
    }
  },

  handleAnswer: async (fromId: string, sdp: RTCSessionDescriptionInit) => {
    const { peerConnections } = get();
    const peer = peerConnections.get(fromId);
    if (!peer) return;

    await peer.pc.setRemoteDescription(sdp);
  },

  handleIceCandidate: async (fromId: string, candidate: RTCIceCandidateInit) => {
    const { peerConnections, hostConnection } = get();

    // Check both peer connections (host) and host connection (client)
    const peer = peerConnections.get(fromId) || (hostConnection?.odPeerId === fromId ? hostConnection : null);
    if (!peer) return;

    try {
      await peer.pc.addIceCandidate(candidate);
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  },

  setConnectionState: (connectionState: ConnectionState) => {
    set({ connectionState });
  },

  clearError: () => {
    set({ error: null });
  },

  cleanup: () => {
    const { signalingWs, peerConnections, hostConnection } = get();

    // Close signaling WebSocket
    if (signalingWs) {
      signalingWs.onclose = null;
      signalingWs.onerror = null;
      signalingWs.onmessage = null;
      try {
        signalingWs.close(1000);
      } catch {
        // Ignore
      }
    }

    // Close all peer connections
    peerConnections.forEach((peer) => {
      cleanupPeerConnection(peer.pc);
    });

    // Close host connection
    if (hostConnection) {
      cleanupPeerConnection(hostConnection.pc);
    }

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    set({
      connectionState: 'disconnected',
      signalingWs: null,
      myPeerId: null,
      lobbyCode: null,
      lobbyInfo: null,
      isHost: false,
      guestToken: null,
      peerConnections: new Map(),
      hostConnection: null,
      connectedPeers: [],
      gameStarted: false,
      error: null,
    });
  },
}));

// Derived selectors
export const selectIsInLobby = (state: MultiplayerStore) => !!state.lobbyCode;
export const selectIsConnected = (state: MultiplayerStore) => state.connectionState === 'connected';
export const selectCanStartGame = (state: MultiplayerStore) =>
  state.isHost && !state.gameStarted;

// Register the multiplayer bridge with gameStore
registerMultiplayerBridge(
  (action) => useMultiplayerStore.getState().sendGameAction(action as GameAction),
  () => {
    const state = useMultiplayerStore.getState();
    return state.connectionState === 'connected' && !!state.lobbyCode;
  },
  () => useMultiplayerStore.getState().isHost
);

// Register the broadcast callback for host to send state updates
registerBroadcastCallback(() => {
  const state = useMultiplayerStore.getState();
  if (!state.isHost) return;

  const gameStore = useGameStore.getState();
  const message: P2PHostMessage = {
    type: 'P2P_STATE_SYNC',
    payload: {
      players: gameStore.players,
      settings: gameStore.settings,
      gameStarted: state.gameStarted,
      highrollMode: gameStore.highrollMode,
      timestamp: Date.now(),
    },
  };
  state.broadcastToClients(message);
});
