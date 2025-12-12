// LobbySession Durable Object - signaling relay for WebRTC connections
import type { Env } from '../index';
import type {
  PeerInfo,
  SignalingLobbyState,
  LobbyInfo,
  SignalingClientMessage,
  SignalingServerMessage,
} from './types';

interface WebSocketWithPeer extends WebSocket {
  odPeerId?: string;
}

interface PeerMeta {
  odPeerId: string;
  peerName: string;
  peerPicture?: string;
  isHost: boolean;
}

// Helper to encode/decode WebSocket metadata as tags
function encodePeerMeta(meta: PeerMeta): string[] {
  return [JSON.stringify(meta)];
}

function decodePeerMeta(tags: string[]): PeerMeta | null {
  try {
    return tags?.[0] ? JSON.parse(tags[0]) : null;
  } catch {
    return null;
  }
}

const MAX_PEERS = 6;

export class LobbySession {
  private state: DurableObjectState;
  private env: Env;
  private lobbyState: SignalingLobbyState | null = null;
  private connections: Map<string, WebSocketWithPeer> = new Map();
  private hostSuspended: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Restore connections on hibernation wake
    this.state.getWebSockets().forEach(ws => {
      const tags = this.state.getTags(ws);
      const meta = decodePeerMeta(tags);
      if (meta?.odPeerId) {
        (ws as WebSocketWithPeer).odPeerId = meta.odPeerId;
        this.connections.set(meta.odPeerId, ws as WebSocketWithPeer);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // REST API endpoints
    if (url.pathname.endsWith('/init') && request.method === 'POST') {
      return this.handleInit(request);
    }

    if (url.pathname.endsWith('/info') && request.method === 'GET') {
      return await this.handleGetInfo();
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleInit(request: Request): Promise<Response> {
    const body = await request.json() as {
      lobbyCode: string;
      hostId: string;
    };

    this.lobbyState = {
      lobbyCode: body.lobbyCode,
      hostId: body.hostId,
      createdAt: Date.now(),
    };

    await this.state.storage.put('lobbyState', this.lobbyState);

    return Response.json({ success: true });
  }

  private async handleGetInfo(): Promise<Response> {
    if (!this.lobbyState) {
      this.lobbyState = await this.state.storage.get('lobbyState') as SignalingLobbyState | undefined ?? null;
    }

    if (!this.lobbyState) {
      return new Response('Lobby not found', { status: 404 });
    }

    const info = this.getLobbyInfo();
    return Response.json(info);
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const odPeerId = url.searchParams.get('odPeerId');
    const peerName = url.searchParams.get('peerName') || 'Player';
    const peerPicture = url.searchParams.get('peerPicture') || undefined;
    const role = url.searchParams.get('role') as 'host' | 'client' || 'client';

    if (!odPeerId) {
      return new Response('Missing odPeerId', { status: 400 });
    }

    // Load lobby state if not loaded
    if (!this.lobbyState) {
      this.lobbyState = await this.state.storage.get('lobbyState') as SignalingLobbyState | undefined ?? null;
    }

    if (!this.lobbyState) {
      return new Response('Lobby not found', { status: 404 });
    }

    // Check if peer limit reached (unless reconnecting)
    const existingConnection = this.connections.get(odPeerId);
    const currentPeerCount = this.connections.size;

    if (!existingConnection && currentPeerCount >= MAX_PEERS) {
      return new Response('Lobby is full', { status: 403 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    const isHost = odPeerId === this.lobbyState.hostId;
    const meta: PeerMeta = { odPeerId, peerName, peerPicture, isHost };

    // Accept with hibernation support
    const wsTags = encodePeerMeta(meta);
    this.state.acceptWebSocket(server, wsTags);
    (server as WebSocketWithPeer).odPeerId = odPeerId;

    // Close existing connection if reconnecting
    if (existingConnection) {
      try {
        existingConnection.close(1000, 'Reconnected from another session');
      } catch {
        // Ignore close errors
      }
    }

    // Add to connections
    this.connections.set(odPeerId, server as WebSocketWithPeer);

    // Send join acknowledgment
    const joinedMessage: SignalingServerMessage = {
      type: 'SIGNALING_JOINED',
      payload: {
        lobbyInfo: this.getLobbyInfo(),
        yourId: odPeerId,
        isHost,
        hostId: this.lobbyState.hostId,
      },
    };
    server.send(JSON.stringify(joinedMessage));

    // Notify host of new peer (if not the host joining)
    if (!isHost) {
      const hostWs = this.connections.get(this.lobbyState.hostId);
      if (hostWs) {
        const peerJoinedMessage: SignalingServerMessage = {
          type: 'SIGNALING_PEER_JOINED',
          payload: {
            odPeerId,
            peerName,
            peerPicture,
          },
        };
        this.sendTo(this.lobbyState.hostId, peerJoinedMessage);
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocketWithPeer, message: string | ArrayBuffer): Promise<void> {
    const odPeerId = ws.odPeerId;
    if (!odPeerId || !this.lobbyState) return;

    try {
      const msg: SignalingClientMessage = JSON.parse(message as string);
      await this.handleMessage(odPeerId, msg);
    } catch (err) {
      console.error('Error handling message:', err);
      this.sendTo(odPeerId, {
        type: 'SIGNALING_ERROR',
        payload: { code: 'INVALID_MESSAGE', message: 'Failed to process message' },
      });
    }
  }

  async webSocketClose(ws: WebSocketWithPeer, code: number, reason: string): Promise<void> {
    const odPeerId = ws.odPeerId;
    if (!odPeerId) return;

    this.connections.delete(odPeerId);

    // If host disconnected
    if (odPeerId === this.lobbyState?.hostId) {
      if (this.hostSuspended) {
        // Host suspended gracefully - keep lobby alive for resumption
        // Clients already notified via SIGNALING_HOST_SUSPENDED
        this.hostSuspended = false; // Reset for next connection
      } else {
        // Host disconnected without suspending - destroy lobby
        this.broadcast({ type: 'SIGNALING_HOST_DISCONNECTED' });
        await this.closeLobby();
      }
    } else {
      // Client left - notify host if connected
      if (this.lobbyState) {
        this.sendTo(this.lobbyState.hostId, {
          type: 'SIGNALING_PEER_LEFT',
          payload: { odPeerId },
        });
      }
    }
  }

  async webSocketError(ws: WebSocketWithPeer, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    const odPeerId = ws.odPeerId;
    if (odPeerId) {
      this.connections.delete(odPeerId);
    }
  }

  private async handleMessage(odPeerId: string, msg: SignalingClientMessage): Promise<void> {
    if (!this.lobbyState) return;

    switch (msg.type) {
      case 'SIGNALING_PING':
        this.sendTo(odPeerId, { type: 'SIGNALING_PONG' });
        break;

      case 'SIGNALING_OFFER':
        // Relay SDP offer to target peer
        this.sendTo(msg.payload.targetId, {
          type: 'SIGNALING_OFFER_RECEIVED',
          payload: {
            fromId: odPeerId,
            sdp: msg.payload.sdp,
          },
        });
        break;

      case 'SIGNALING_ANSWER':
        // Relay SDP answer to target peer
        this.sendTo(msg.payload.targetId, {
          type: 'SIGNALING_ANSWER_RECEIVED',
          payload: {
            fromId: odPeerId,
            sdp: msg.payload.sdp,
          },
        });
        break;

      case 'SIGNALING_ICE_CANDIDATE':
        // Relay ICE candidate to target peer
        this.sendTo(msg.payload.targetId, {
          type: 'SIGNALING_ICE_CANDIDATE_RECEIVED',
          payload: {
            fromId: odPeerId,
            candidate: msg.payload.candidate,
          },
        });
        break;

      case 'SIGNALING_HOST_SUSPEND':
        // Host is temporarily suspending - keep lobby alive
        if (odPeerId === this.lobbyState?.hostId) {
          this.hostSuspended = true;
          // Notify all clients that host is temporarily away
          this.broadcast({ type: 'SIGNALING_HOST_SUSPENDED' });
        }
        break;
    }
  }

  private getLobbyInfo(): LobbyInfo {
    const peers: PeerInfo[] = [];

    this.connections.forEach((ws, odPeerId) => {
      const tags = this.state.getTags(ws);
      const meta = decodePeerMeta(tags);
      peers.push({
        odPeerId,
        name: meta?.peerName || 'Guest',
        picture: meta?.peerPicture,
        isHost: odPeerId === this.lobbyState?.hostId,
      });
    });

    return {
      lobbyCode: this.lobbyState!.lobbyCode,
      hostId: this.lobbyState!.hostId,
      createdAt: this.lobbyState!.createdAt,
      peers,
      peerCount: this.connections.size,
      maxPeers: MAX_PEERS,
    };
  }

  private async closeLobby(): Promise<void> {
    // Close all connections
    this.connections.forEach(ws => {
      try {
        ws.close(1000, 'Lobby closed');
      } catch {
        // Ignore errors
      }
    });

    this.connections.clear();
    this.lobbyState = null;
    await this.state.storage.deleteAll();
  }

  private broadcast(message: SignalingServerMessage): void {
    const data = JSON.stringify(message);
    this.connections.forEach(ws => {
      try {
        ws.send(data);
      } catch {
        // Connection might be closed
      }
    });
  }

  private sendTo(odPeerId: string, message: SignalingServerMessage): void {
    const ws = this.connections.get(odPeerId);
    if (ws) {
      try {
        ws.send(JSON.stringify(message));
      } catch {
        // Connection might be closed
      }
    }
  }
}
