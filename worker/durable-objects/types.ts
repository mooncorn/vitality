// Signaling Types for Worker (WebRTC signaling only, no game state)

// User from OAuth (needed by auth modules)
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
}

// WebRTC types for Cloudflare Workers (which don't have DOM types)
interface RTCSessionDescriptionInit {
  type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// Peer info for WebRTC connections
export interface PeerInfo {
  odPeerId: string;
  name: string;
  picture?: string;
  isHost: boolean;
}

// Lobby state stored in Durable Object (signaling only)
export interface SignalingLobbyState {
  lobbyCode: string;
  hostId: string;
  createdAt: number;
}

// Lobby info for API responses
export interface LobbyInfo {
  lobbyCode: string;
  hostId: string;
  createdAt: number;
  peers: PeerInfo[];
  peerCount: number;
  maxPeers: number;
}

// ============ Signaling Messages (Client <-> Server) ============

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
  | SignalingPongMessage
  | SignalingErrorMessage;
