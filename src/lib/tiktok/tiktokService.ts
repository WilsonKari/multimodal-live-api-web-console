import { io, Socket } from 'socket.io-client';
import { TIKTOK_SOCKET_CONFIG } from './tiktokConfig';
import eventBus from '../events/eventBus';

export class TikTokService {
    private socket: Socket | null = null;
    private static instance: TikTokService;

    private constructor() {
        this.initializeSocket();
        this.reconnect();
    }

    public static getInstance(): TikTokService {
        if (!TikTokService.instance) {
            TikTokService.instance = new TikTokService();
        }
        return TikTokService.instance;
    }

    private initializeSocket(): void {
        this.socket = io(TIKTOK_SOCKET_CONFIG.SERVER_URL, {
            reconnectionAttempts: TIKTOK_SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
            reconnectionDelay: TIKTOK_SOCKET_CONFIG.RECONNECTION_DELAY,
            autoConnect: false
        });

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CONNECT, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.DISCONNECT, () => {
            this.reconnect();
        });
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.ERROR, (error) => {
            console.error('Error de conexión:', error);
        });

        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE, (data) => {
            const chatData = {
                comment: data?.comment,
                uniqueId: data?.uniqueId,
                nickname: data?.nickname,
                followRole: data?.followRole,
                userBadgeLevel: data?.userBadges?.[0]?.level,
                isModerator: data?.isModerator,
                isNewGifter: data?.isNewGifter,
                isSubscriber: data?.isSubscriber,
                topGifterRank: data?.topGifterRank,
                eventType: 'tiktokChatMessage'
            };
            eventBus.emit('tiktokChatMessage', chatData);
        });

        // Setup empty handlers for other events
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.EMOTE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.GIFT, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.ENVELOPE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.SUBSCRIBE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.LIKE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.SHARE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.FOLLOW, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.MEMBER, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.ROOM_USER, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.QUESTION_NEW, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.LINK_MIC_BATTLE, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.LINK_MIC_ARMIES, () => {});
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.LIVE_INTRO, () => {});
    }

    // Public methods
    public disconnect(): void {
        this.socket?.disconnect();
    }

    public reconnect(): void {
        if (this.socket && !this.socket.connected) {
            this.socket.connect();
        }
    }

    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    public subscribe<T>(event: string, callback: (data: T) => void): void {
        this.socket?.on(event, callback);
    }

    public unsubscribe(event: string): void {
        this.socket?.off(event);
    }
}

export const tiktokService = TikTokService.getInstance();
