import { io, Socket } from 'socket.io-client';
import { TIKTOK_SOCKET_CONFIG } from './tiktokConfig';
import eventBus from '../events/eventBus';
import { useEventStore } from '../events/eventStore';

export class TikTokService {
    private socket: Socket | null = null;
    private static instance: TikTokService;
    private eventListenersActive: boolean = true;
    private activeChatListener: ((data: any) => void) | null = null;
    private connected = false;
    private lastMessageInfo: string | null = null;
    private lastUpdateTime: number = 0;
    private readonly DEBOUNCE_TIME = 2000; // 2 segundos entre actualizaciones
    private processedMessages: Set<string> = new Set(); // Conjunto para registrar mensajes procesados
    private cleanupInterval: NodeJS.Timeout | null = null;
    private readonly MESSAGE_HISTORY_EXPIRY = 300000; // 5 minutos para olvidar mensajes procesados
    private readonly MAX_HISTORY_SIZE = 100; // Máximo número de mensajes a mantener en historial
    private reconnectionAttempts = 0;
    private maxReconnectionAttempts = 10; // Límite de intentos de reconexión manual
    private reconnectionTimer: NodeJS.Timeout | null = null;

    private constructor() {
        this.initializeSocket();
        this.setupMessageHistoryCleanup();
        this.listenForStateChanges();
        
        // Conectar el socket independientemente del estado de los eventos
        this.reconnect();
    }

    public static getInstance(): TikTokService {
        if (!TikTokService.instance) {
            TikTokService.instance = new TikTokService();
        }
        return TikTokService.instance;
    }

    private initializeSocket(): void {
        try {
            console.log('Inicializando conexión con TikTok en:', TIKTOK_SOCKET_CONFIG.SERVER_URL);
            this.socket = io(TIKTOK_SOCKET_CONFIG.SERVER_URL, {
                reconnectionAttempts: TIKTOK_SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
                reconnectionDelay: TIKTOK_SOCKET_CONFIG.RECONNECTION_DELAY,
                timeout: 5000,
                autoConnect: true // Cambiado a true para seguir el enfoque de Spotify
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error al inicializar socket de TikTok:', error);
        }
    }

    private listenForStateChanges(): void {
        eventBus.on('eventStateChanged', (data: { eventType: string, enabled: boolean }) => {
            if (data.eventType === 'tiktokChatMessage') {
                console.log('[TikTokService] Estado de evento cambiado:', {
                    eventType: data.eventType,
                    enabled: data.enabled,
                    timestamp: new Date().toISOString()
                });
                
                // Actualizar el estado de escucha de eventos pero NO conectar/desconectar el socket
                if (data.enabled) {
                    this.activateEventListeners();
                } else {
                    this.deactivateEventListeners();
                    // Limpiar mensajes pendientes pero no desconectar el socket
                    this.clearPendingMessages();
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
        if (this.eventListenersActive) return;
        
        console.log('[TikTokService] Activando procesamiento de eventos');
        this.eventListenersActive = true;
    }
    
    private deactivateEventListeners(): void {
        if (!this.eventListenersActive) return;
        
        console.log('[TikTokService] Desactivando procesamiento de eventos');
        this.eventListenersActive = false;
        
        // Borrar cualquier mensaje pendiente que pudiera estar en la cola
        this.clearPendingMessages();
    }

    private clearPendingMessages(): void {
        // Emitir un evento para notificar que se deben limpiar los mensajes de TikTok pendientes
        eventBus.emit('clearTikTokPendingMessages');
    }
    
    private setupMessageHistoryCleanup(): void {
        // Configurar limpieza periódica de historial para evitar consumo excesivo de memoria
        this.cleanupInterval = setInterval(() => {
            // Limpiar mensajes antiguos para prevenir crecimiento ilimitado de memoria
            const now = Date.now();
            const messagesToRemove: string[] = [];
            
            // Identificar mensajes antiguos para eliminar
            this.processedMessages.forEach(messageIdWithTimestamp => {
                const [, timestamp] = messageIdWithTimestamp.split('|');
                if (now - parseInt(timestamp) > this.MESSAGE_HISTORY_EXPIRY) {
                    messagesToRemove.push(messageIdWithTimestamp);
                }
            });
            
            // Eliminar mensajes antiguos
            messagesToRemove.forEach(message => {
                this.processedMessages.delete(message);
            });
            
            console.log('[TikTok-Debug] Limpieza de historial de mensajes:', {
                removedMessages: messagesToRemove.length,
                remainingMessages: this.processedMessages.size,
                timestamp: new Date().toISOString()
            });
            
            // Si aún queda un número excesivo de mensajes, eliminar los más antiguos
            if (this.processedMessages.size > this.MAX_HISTORY_SIZE) {
                const messageArray = Array.from(this.processedMessages);
                messageArray.sort((a, b) => {
                    const timestampA = parseInt(a.split('|')[1]);
                    const timestampB = parseInt(b.split('|')[1]);
                    return timestampA - timestampB;
                });
                
                const messagesToKeep = messageArray.slice(-this.MAX_HISTORY_SIZE);
                this.processedMessages = new Set(messagesToKeep);
                
                console.log('[TikTok-Debug] Limpieza adicional por tamaño máximo:', {
                    newSize: this.processedMessages.size,
                    timestamp: new Date().toISOString()
                });
            }
        }, 60000); // Ejecutar cada minuto
    }

    private setupChatMessageListener(): void {
        if (!this.socket) return;
        
        const chatMessageHandler = (data: any) => {
            const currentTime = Date.now();
            
            // Log inicial para verificar que el handler se está llamando
            console.log('[TikTok-Debug] Handler de chatMessage invocado:', {
                dataRecibida: data,
                timestamp: new Date().toISOString()
            });
            
            // Verificar el estado desde el store, similar a Spotify
            const store = useEventStore.getState();
            const tiktokConfig = store.eventConfigs.find(config => config.eventType === 'tiktokChatMessage');
            
            // Solo procesar si el evento está habilitado
            if (!tiktokConfig?.enabled) {
                console.log('[TikTok-Debug] Evento bloqueado porque tiktokChatMessage está desactivado');
                return;
            }
            
            // Crear un ID único para el mensaje
            const uniqueId = data?.uniqueId || 'anonymous';
            const nickname = data?.nickname || 'anon';
            const comment = data?.comment || '';
            const messageId = `${uniqueId}-${nickname}-${comment.substring(0, 20)}`;
            const messageIdWithTimestamp = `${messageId}|${currentTime}`;
            
            // 1. Verificar si es el mismo mensaje recibido recientemente (debounce)
            if (this.lastMessageInfo === messageId && 
                currentTime - this.lastUpdateTime < this.DEBOUNCE_TIME) {
                console.log('[TikTok-Debug] Mensaje duplicado ignorado (debounce):', {
                    messageId,
                    timeSinceLastUpdate: currentTime - this.lastUpdateTime,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            // 2. Verificar en el registro histórico si ya hemos procesado este mensaje recientemente
            const recentDuplicate = Array.from(this.processedMessages).some(item => {
                const [storedMessageId, timestampStr] = item.split('|');
                const timestamp = parseInt(timestampStr);
                // Considerar duplicado si es el mismo mensaje y no han pasado más de 30 segundos
                return storedMessageId === messageId && currentTime - timestamp < 30000;
            });
            
            if (recentDuplicate) {
                console.log('[TikTok-Debug] Mensaje duplicado ignorado (historial):', {
                    messageId,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            console.log('[TikTok-Debug] Procesando nuevo mensaje de TikTok:', {
                uniqueId: data?.uniqueId,
                nickname: data?.nickname,
                comment: data?.comment,
                messageId,
                timestamp: new Date().toISOString()
            });
            
            // Actualizar control de duplicados
            this.lastMessageInfo = messageId;
            this.lastUpdateTime = currentTime;
            this.processedMessages.add(messageIdWithTimestamp);
            
            // Formatear los datos de chat
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
            
            // Enviar directamente al SidePanel mediante approvedChatMessage, similar a spotify
            const messageForAssistant = `[TikTok] ${chatData.nickname}: ${chatData.comment}`;
            
            // Emitimos tanto el evento tiktokChatMessage para los manejadores específicos
            // como approvedChatMessage para la integración directa con SidePanel
            try {
                eventBus.emit('tiktokChatMessage', chatData);
                eventBus.emit('approvedChatMessage', messageForAssistant);
                
                console.log('[TikTok-Debug] Mensaje enviado directamente a SidePanel:', {
                    message: messageForAssistant,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('[TikTok-Error] Error al emitir eventos:', {
                    error,
                    timestamp: new Date().toISOString()
                });
            }
        };
        
        // Siempre registramos el listener, independientemente del estado del evento
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CHAT_MESSAGE, chatMessageHandler);
        
        // Guardar referencia al handler para uso futuro si es necesario
        this.activeChatListener = chatMessageHandler;
        
        console.log('[TikTok-Setup] Listener de chat configurado correctamente');
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        // Eventos de conexión básica
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.CONNECT, () => {
            console.log('✅ Conexión establecida con el servidor de TikTok');
            this.connected = true;
            this.reconnectionAttempts = 0; // Resetear contador de intentos al conectar exitosamente
        });
        
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.DISCONNECT, (reason) => {
            console.log(`❌ Desconectado del servidor de TikTok: ${reason}`);
            this.connected = false;
            
            // Siempre intentar reconectar, independientemente de los estados de los eventos
            this.reconnect();
        });
        
        this.socket.on(TIKTOK_SOCKET_CONFIG.EVENTS.ERROR, (error) => {
            console.error('❌ Error de conexión con TikTok:', error);
            this.connected = false;
        });
        
        // Añadir manejo de error de conexión
        this.socket.on('connect_error', (error) => {
            console.error('❌ Error al intentar conectar con TikTok:', error.message);
            this.connected = false;
        });

        // Configurar los listeners para todos los eventos disponibles
        this.setupChatMessageListener();

        // Setup other event handlers - Estos pueden implementarse en el futuro
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
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
        }
        
        this.socket?.disconnect();
    }

    public reconnect(): void {
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
        }

        // Si ya alcanzamos el máximo de intentos, no seguimos intentando
        if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
            console.log(`Máximo de intentos de reconexión (${this.maxReconnectionAttempts}) alcanzado. Verifica que el servidor de TikTok esté corriendo en ${TIKTOK_SOCKET_CONFIG.SERVER_URL}`);
            return;
        }

        if (this.socket && !this.socket.connected) {
            this.reconnectionAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectionAttempts), 30000); // Backoff exponencial con máximo de 30 segundos
            
            console.log(`Intentando reconexión al servidor de TikTok... (Intento ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}, próximo intento en ${delay/1000}s)`);
            
            try {
                this.socket.connect();
                
                // Programar próximo intento si este falla
                this.reconnectionTimer = setTimeout(() => {
                    if (!this.socket?.connected) {
                        this.reconnect();
                    } else {
                        // Si se conectó exitosamente, reiniciar contador
                        this.reconnectionAttempts = 0;
                    }
                }, delay);
            } catch (error) {
                console.error('Error al intentar reconectar:', error);
                // Programar un nuevo intento incluso si hubo error
                this.reconnectionTimer = setTimeout(() => this.reconnect(), delay);
            }
        }
    }

    public isConnected(): boolean {
        // Usar tanto la propiedad interna como el estado del socket
        return this.connected && (this.socket?.connected || false);
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
    
    // Método para simular un mensaje de chat de TikTok para pruebas
    public simulateChatMessage(nickname: string = 'TestUser', comment: string = 'Mensaje de prueba'): void {
        console.log('[TikTok-Test] Simulando mensaje de chat:', {
            nickname,
            comment,
            timestamp: new Date().toISOString()
        });
        
        // Verificar estado desde el store
        const store = useEventStore.getState();
        const tiktokConfig = store.eventConfigs.find(config => config.eventType === 'tiktokChatMessage');
        
        // Verificar si los listeners están activos y si el evento está habilitado
        if (!this.eventListenersActive || !tiktokConfig?.enabled) {
            console.log('[TikTok-Test] No se puede simular mensaje porque el evento o los listeners están desactivados:', {
                eventListenersActive: this.eventListenersActive,
                eventEnabled: tiktokConfig?.enabled,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        // Verificar además que el socket esté conectado
        if (!this.isConnected()) {
            console.log('[TikTok-Test] No se puede simular mensaje porque el socket no está conectado');
            return;
        }
        
        // Crear un objeto de datos similar al que enviaría el socket de TikTok
        const mockChatData = {
            uniqueId: `test_${Date.now()}`,
            nickname,
            comment,
            followRole: 1, // 1 = follower
            userBadges: [{ level: 1 }],
            isModerator: false,
            isNewGifter: false,
            isSubscriber: false,
            topGifterRank: null
        };
        
        // Procesar el mensaje usando el mismo handler que usamos para eventos reales
        if (this.activeChatListener) {
            this.activeChatListener(mockChatData);
        } else {
            console.log('[TikTok-Test] No hay listener activo para procesar el mensaje simulado');
            
            // Como fallback, emitir directamente los eventos
            const chatData = {
                comment,
                uniqueId: mockChatData.uniqueId,
                nickname,
                followRole: mockChatData.followRole,
                userBadgeLevel: 1,
                isModerator: false,
                isNewGifter: false,
                isSubscriber: false,
                topGifterRank: null,
                eventType: 'tiktokChatMessage'
            };
            
            const messageForAssistant = `[TikTok] ${nickname}: ${comment}`;
            
            console.log('[TikTok-Test] Emitiendo eventos directamente:', {
                eventEnabled: tiktokConfig?.enabled,
                timestamp: new Date().toISOString()
            });
            
            eventBus.emit('tiktokChatMessage', chatData);
            eventBus.emit('approvedChatMessage', messageForAssistant);
        }
    }
}

export const tiktokService = TikTokService.getInstance();
