import { io, type Socket } from 'socket.io-client';
import { getEnv } from '../env';

type Listener = (...args: unknown[]) => void;

type ReconnectListener = () => void;

class SocketService {
  private socket: Socket | null = null;
  private subscribedWallets = new Set<string>();
  private yieldChannel: string | null = null;
  private pendingListeners: { event: string; callback: Listener }[] = [];
  private isDisconnectingManually = false;
  private hasConnectedOnce = false;
  private reconnectListeners = new Set<ReconnectListener>();

  connect(jwtToken?: string): void {
    if (this.socket) {
      this.flushPendingListeners();
      return;
    }

    const { EXPO_PUBLIC_API_URL } = getEnv();

    this.socket = io(EXPO_PUBLIC_API_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...(jwtToken ? { auth: { token: jwtToken } } : {}),
    });

    this.flushPendingListeners();

    this.socket.on('connect', () => {
      if (__DEV__) console.log('[Socket] connected:', this.socket?.id);
      this.subscribedWallets.forEach((addr) => this.socket?.emit('subscribe:wallet', addr));
      if (this.yieldChannel) this.socket?.emit('subscribe:yield', this.yieldChannel);

      // First connect = nothing to catch up. Subsequent connects mean we
      // dropped and reconnected, so fire reconnect listeners for callers
      // (e.g. RQ invalidation) to refetch what they may have missed.
      if (this.hasConnectedOnce) {
        this.reconnectListeners.forEach((cb) => {
          try { cb(); } catch (e) { if (__DEV__) console.warn('[Socket] reconnect cb threw:', e); }
        });
      }
      this.hasConnectedOnce = true;
    });

    this.socket.on('disconnect', (reason) => {
      if (__DEV__ && !this.isDisconnectingManually && reason !== 'io client disconnect') {
        console.warn('[Socket] disconnected:', reason);
      }
      this.isDisconnectingManually = false;
    });

    this.socket.on('connect_error', (error) => {
      if (__DEV__) console.warn('[Socket] connect_error:', error.message);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.isDisconnectingManually = true;
    this.socket.disconnect();
    this.socket = null;
    this.subscribedWallets.clear();
    this.yieldChannel = null;
    this.hasConnectedOnce = false;
  }

  onReconnect(callback: ReconnectListener): () => void {
    this.reconnectListeners.add(callback);
    return () => {
      this.reconnectListeners.delete(callback);
    };
  }

  subscribeToWallet(address: string): void {
    this.subscribedWallets.add(address);
    if (this.socket?.connected) this.socket.emit('subscribe:wallet', address);
  }

  unsubscribeFromWallet(address: string): void {
    this.subscribedWallets.delete(address);
  }

  subscribeToYield(userIdHash: string): void {
    this.yieldChannel = userIdHash;
    if (this.socket?.connected) this.socket.emit('subscribe:yield', userIdHash);
  }

  on(event: string, callback: Listener): void {
    if (!this.socket) {
      this.pendingListeners = this.pendingListeners.filter(
        (l) => !(l.event === event && l.callback === callback),
      );
      this.pendingListeners.push({ event, callback });
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: Listener): void {
    this.pendingListeners = callback
      ? this.pendingListeners.filter((l) => !(l.event === event && l.callback === callback))
      : this.pendingListeners.filter((l) => l.event !== event);

    if (!this.socket) return;
    if (callback) this.socket.off(event, callback);
    else this.socket.off(event);
  }

  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) return;
    this.socket.emit(event, data);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private flushPendingListeners(): void {
    if (!this.socket || this.pendingListeners.length === 0) return;
    for (const { event, callback } of this.pendingListeners) {
      this.socket.on(event, callback);
    }
    this.pendingListeners = [];
  }
}

export const socketService = new SocketService();
