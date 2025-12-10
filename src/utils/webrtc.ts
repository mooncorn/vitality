// WebRTC utilities for P2P communication

// ICE server configuration for NAT traversal
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// DataChannel configuration for reliable, ordered delivery
export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
};

// Connection timeout in milliseconds
export const CONNECTION_TIMEOUT_MS = 30000;

// Create a new RTCPeerConnection with standard configuration
export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS,
  });
}

// Create a data channel on a peer connection (host-side)
export function createDataChannel(
  peerConnection: RTCPeerConnection,
  label: string = 'game'
): RTCDataChannel {
  return peerConnection.createDataChannel(label, DATA_CHANNEL_CONFIG);
}

// Send a message through a data channel with JSON serialization
export function sendDataChannelMessage(
  dataChannel: RTCDataChannel,
  message: unknown
): boolean {
  if (dataChannel.readyState !== 'open') {
    console.warn('DataChannel not open, readyState:', dataChannel.readyState);
    return false;
  }

  try {
    dataChannel.send(JSON.stringify(message));
    return true;
  } catch (err) {
    console.error('Failed to send DataChannel message:', err);
    return false;
  }
}

// Parse a message received from a data channel
export function parseDataChannelMessage<T>(data: string | ArrayBuffer): T | null {
  try {
    const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
    return JSON.parse(str) as T;
  } catch (err) {
    console.error('Failed to parse DataChannel message:', err);
    return null;
  }
}

// Check if a peer connection is in a usable state
export function isPeerConnectionUsable(pc: RTCPeerConnection): boolean {
  return pc.connectionState === 'connected' || pc.connectionState === 'connecting';
}

// Check if a data channel is ready for messaging
export function isDataChannelReady(dc: RTCDataChannel): boolean {
  return dc.readyState === 'open';
}

// Get a human-readable connection state
export function getConnectionStateDescription(state: RTCPeerConnectionState): string {
  switch (state) {
    case 'new':
      return 'Initializing...';
    case 'connecting':
      return 'Connecting...';
    case 'connected':
      return 'Connected';
    case 'disconnected':
      return 'Disconnected';
    case 'failed':
      return 'Connection failed';
    case 'closed':
      return 'Connection closed';
    default:
      return 'Unknown';
  }
}

// Helper to wait for ICE gathering to complete (with timeout)
export function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  timeoutMs: number = 5000
): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      resolve(); // Resolve anyway after timeout, use whatever candidates we have
    }, timeoutMs);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
}

// Clean up a peer connection and its data channels
export function cleanupPeerConnection(pc: RTCPeerConnection): void {
  try {
    pc.close();
  } catch {
    // Ignore errors during cleanup
  }
}
