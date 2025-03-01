import { io, Socket } from 'socket.io-client';
import { TIKTOK_SOCKET_CONFIG } from './tiktokConfig';
import eventBus from '../events/eventBus';
import { useEventStore } from '../events/eventStore';

export class TikTokService {
    private socket: Socket | null = null;
    private static instance: TikTokService;
    private eventListenersActive: boolean = true;
    private activeChatListener: ((data: any) => void) | null = null;

    private constructor() {
        this.initializeSocket();
        this.reconnect();
        this.listenForStateChanges();
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

    private listenForStateChanges(): void {
        eventBus.on('eventStateChanged', (data: { eventType: string, enabled: boolean }) => {
            if (data.eventType === 'tiktokChatMessage') {
                console.log('[TikTokService] Estado de evento cambiado:', {
                    eventType: data.eventType,
                    enabled: data.enabled,
                    timestamp: new Date().toISOString()
                });
                
                // Activar o desactivar la escucha de eventos del socket
                if (data.enabled) {
                    this.activateEventListeners();
                } else {
                    this.deactivateEventListeners();
                }
            }
        });
        
        // Verificar estado inicial
        const initialState = useEventStore.getState();
        const eventEnabled = initialState.eventConfigs.find(
            config => config.eventType === 'tiktokChatMessage'
        )?.enabled || false;
        
        this.eventListenersActive = eventEnabled;
        
        console.log('[TikTokService] Estado inicial de eventos:', {
            eventListenersActive: this.eventListenersActive,
            timestamp: new Date().toISOString()
        });
    }
    
    private activateEventListeners(): void {
        if (this.eventListenersActive || !this.socket) return;
        
        console.log('[TikTokService] Activando escucha de eventos');
        this.eventListenersActive = true;
        
        // Restaurar el listener de chat si existe
        if (this.activeChatListener) {
            this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE, this.activeChatListener);
        } else {
            this.setupChatMessageListener();
        }
    }
    
    private deactivateEventListeners(): void {
        if (!this.eventListenersActive || !this.socket) return;
        
        console.log('[TikTokService] Desactivando escucha de eventos');
        this.eventListenersActive = false;
        
        // Guardar la referencia al listener actual antes de eliminarlo
        if (!this.activeChatListener) {
            this.socket.listeners(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE).forEach(listener => {
                this.activeChatListener = listener;
            });
        }
        
        // Eliminar el listener de chat a nivel de socket
        this.socket.off(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE);
    }

    private setupChatMessageListener(): void {
        if (!this.socket) return;
        
        const chatMessageHandler = (data: any) => {
            // Solo emitir si el eventBus indica que el evento está habilitado
            if (!eventBus.isEventEnabled('tiktokChatMessage')) {
                return;
            }
            
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
        };
        
        // Guardar referencia al handler para poder restaurarlo más tarde
        this.activeChatListener = chatMessageHandler;
        
        // Registrar el handler en el socket
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE, chatMessageHandler);
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

        // Configurar el listener de chat solo si los eventos están activos
        if (this.eventListenersActive) {
            this.setupChatMessageListener();
        }

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
    
    // Método público para verificar si los listeners están activos
    public isEventListenerActive(): boolean {
        return this.eventListenersActive;
    }
}

export const tiktokService = TikTokService.getInstance();
