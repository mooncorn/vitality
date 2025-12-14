// Multiplayer types for the frontend

import type { CounterType, Player, GameSettings, PlayerTheme, HighrollModeState } from './index';

// User from OAuth
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
}

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Peer info for WebRTC connections
export interface PeerInfo {
  odPeerId: string;
  name: string;
  picture?: string;
  isHost: boolean;
}

// Lobby info from server (simplified for signaling-only)
export interface LobbyInfo {
  lobbyCode: string;
  hostId: string;
  createdAt: number;
  peers: PeerInfo[];
  peerCount: number;
  maxPeers: number;
}

// Saved game state for session persistence
export interface SavedGameState {
  players: Player[];
  settings: GameSettings;
}

// User's lobby entry (from /api/lobby/my-lobbies)
export interface UserLobbyEntry {
  id: string; // UUID for internal tracking
  lobbyCode?: string; // Only set if session was hosted (multiplayer join code)
  name?: string; // Display name like "Blazing Phoenix"
  createdAt: number;
  status: 'active';
  gameState: SavedGameState;
}

// ============ Signaling Messages (Client <-> Server via WebSocket) ============

// Server -> Client: Acknowledge join
export interface SignalingJoinedMessage {
  type: 'SIGNALING_JOINED';
  payload: {
    lobbyInfo: LobbyInfo;
    yourId: string;
    isHost: boolean;
    hostId: string | null;
  };
}

// Client -> Server: Forward SDP offer to specific peer
export interface SignalingOfferMessage {
  type: 'SIGNALING_OFFER';
  payload: {
    targetId: string;
    sdp: RTCSessionDescriptionInit;
  };
}

// Client -> Server: Forward SDP answer to specific peer
export interface SignalingAnswerMessage {
  type: 'SIGNALING_ANSWER';
  payload: {
    targetId: string;
    sdp: RTCSessionDescriptionInit;
  };
}

// Client -> Server: Forward ICE candidate to specific peer
export interface SignalingIceCandidateMessage {
  type: 'SIGNALING_ICE_CANDIDATE';
  payload: {
    targetId: string;
    candidate: RTCIceCandidateInit;
  };
}

// Server -> Client: Relay offer from peer
export interface SignalingOfferReceivedMessage {
  type: 'SIGNALING_OFFER_RECEIVED';
  payload: {
    fromId: string;
    sdp: RTCSessionDescriptionInit;
  };
}

// Server -> Client: Relay answer from peer
export interface SignalingAnswerReceivedMessage {
  type: 'SIGNALING_ANSWER_RECEIVED';
  payload: {
    fromId: string;
    sdp: RTCSessionDescriptionInit;
  };
}

// Server -> Client: Relay ICE candidate from peer
export interface SignalingIceCandidateReceivedMessage {
  type: 'SIGNALING_ICE_CANDIDATE_RECEIVED';
  payload: {
    fromId: string;
    candidate: RTCIceCandidateInit;
  };
}

// Server -> Client: New peer joined (host needs to initiate connection)
export interface SignalingPeerJoinedMessage {
  type: 'SIGNALING_PEER_JOINED';
  payload: {
    odPeerId: string;
    peerName: string;
    peerPicture?: string;
  };
}

// Server -> Client: Peer left
export interface SignalingPeerLeftMessage {
  type: 'SIGNALING_PEER_LEFT';
  payload: {
    odPeerId: string;
  };
}

// Server -> Clients: Host disconnected - session ending
export interface SignalingHostDisconnectedMessage {
  type: 'SIGNALING_HOST_DISCONNECTED';
}

// Client -> Server: Host is suspending (temporarily leaving, keep lobby alive)
export interface SignalingHostSuspendMessage {
  type: 'SIGNALING_HOST_SUSPEND';
}

// Server -> Clients: Host has suspended (temporarily away)
export interface SignalingHostSuspendedMessage {
  type: 'SIGNALING_HOST_SUSPENDED';
}

// Server -> Clients: Lobby is being forcibly closed
export interface SignalingLobbyClosedMessage {
  type: 'SIGNALING_LOBBY_CLOSED';
  payload: { reason: string };
}

// Ping/Pong for signaling connection keepalive
export interface SignalingPingMessage {
  type: 'SIGNALING_PING';
}

export interface SignalingPongMessage {
  type: 'SIGNALING_PONG';
}

// Error message from server
export interface SignalingErrorMessage {
  type: 'SIGNALING_ERROR';
  payload: {
    code: string;
    message: string;
  };
}

export type SignalingClientMessage =
  | SignalingOfferMessage
  | SignalingAnswerMessage
  | SignalingIceCandidateMessage
  | SignalingPingMessage
  | SignalingHostSuspendMessage;

export type SignalingServerMessage =
  | SignalingJoinedMessage
  | SignalingOfferReceivedMessage
  | SignalingAnswerReceivedMessage
  | SignalingIceCandidateReceivedMessage
  | SignalingPeerJoinedMessage
  | SignalingPeerLeftMessage
  | SignalingHostDisconnectedMessage
  | SignalingHostSuspendedMessage
  | SignalingLobbyClosedMessage
  | SignalingPongMessage
  | SignalingErrorMessage;

// ============ P2P Messages (Host <-> Client via RTCDataChannel) ============

// Game actions that clients can send to host
export type GameAction =
  | { type: 'UPDATE_COUNTER'; playerId: string; counterType: CounterType; delta: number }
  | { type: 'SET_COUNTER'; playerId: string; counterType: CounterType; value: number }
  | { type: 'UPDATE_COMMANDER_DAMAGE'; targetPlayerId: string; sourcePlayerId: string; delta: number }
  | { type: 'SET_PLAYER_NAME'; playerId: string; name: string }
  | { type: 'SET_PLAYER_THEME'; playerId: string; theme: Partial<PlayerTheme> }
  | { type: 'RESET_COUNTERS' }
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'TOGGLE_SECONDARY_COUNTER'; playerId: string; counterType: CounterType; enabled: boolean }
  | { type: 'START_HIGHROLL'; results: Record<string, number> }
  | { type: 'END_HIGHROLL' };

// Client -> Host: Request current game state
export interface P2PStateRequestMessage {
  type: 'P2P_STATE_REQUEST';
}

// Host -> Client: Full state sync
export interface P2PStateSyncMessage {
  type: 'P2P_STATE_SYNC';
  payload: {
    players: Player[];
    settings: GameSettings;
    gameStarted: boolean;
    highrollMode: HighrollModeState;
    timestamp: number;
  };
}

// Client -> Host: Game action request
export interface P2PActionMessage {
  type: 'P2P_ACTION';
  payload: {
    action: GameAction;
  };
}

// Host -> Client: Game started notification
export interface P2PGameStartedMessage {
  type: 'P2P_GAME_STARTED';
  payload: {
    players: Player[];
    settings: GameSettings;
  };
}

// Host -> Client: Lobby closed
export interface P2PLobbyClosedMessage {
  type: 'P2P_LOBBY_CLOSED';
  payload: {
    reason: 'host_left' | 'host_closed';
  };
}

// Host -> Clients: A peer connected/disconnected
export interface P2PPeerUpdateMessage {
  type: 'P2P_PEER_UPDATE';
  payload: {
    peers: PeerInfo[];
  };
}

// Bidirectional: Ping/Pong for connection health
export interface P2PPingMessage {
  type: 'P2P_PING';
  payload: { timestamp: number };
}

export interface P2PPongMessage {
  type: 'P2P_PONG';
  payload: { timestamp: number };
}

export type P2PClientMessage =
  | P2PStateRequestMessage
  | P2PActionMessage
  | P2PPingMessage
  | P2PPongMessage;

export type P2PHostMessage =
  | P2PStateSyncMessage
  | P2PGameStartedMessage
  | P2PLobbyClosedMessage
  | P2PPeerUpdateMessage
  | P2PPingMessage
  | P2PPongMessage;
