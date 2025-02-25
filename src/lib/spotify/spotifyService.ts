import { io, Socket } from 'socket.io-client';
import { SPOTIFY_SOCKET_CONFIG } from './spotifyConfig';
import eventBus from '../events/eventBus';
import { useEventStore } from '../events/eventStore';

export class SpotifyService {
    private socket: Socket | null = null;
    private static instance: SpotifyService;
    private connected = false;
    private lastTrackInfo: string | null = null;
    private lastUpdateTime: number = 0;
    private readonly DEBOUNCE_TIME = 2000; // 2 segundos entre actualizaciones

    private constructor() {
        this.initializeSocket();
        // No llamamos a reconnect() aquí porque initializeSocket ya lo hace
    }

    public static getInstance(): SpotifyService {
        if (!SpotifyService.instance) {
            SpotifyService.instance = new SpotifyService();
        }
        return SpotifyService.instance;
    }

    private initializeSocket(): void {
        try {
            console.log('Inicializando conexión con Spotify en:', SPOTIFY_SOCKET_CONFIG.SERVER_URL);
            this.socket = io(SPOTIFY_SOCKET_CONFIG.SERVER_URL, {
                reconnectionAttempts: SPOTIFY_SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
                reconnectionDelay: SPOTIFY_SOCKET_CONFIG.RECONNECTION_DELAY,
                timeout: 5000,
                autoConnect: true // Cambiado a true para conectar automáticamente
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error al inicializar socket de Spotify:', error);
        }
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        // Eventos de conexión básica
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.CONNECT, () => {
            console.log('✅ Conexión establecida con el servidor de Spotify');
            this.connected = true;
        });
        
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.DISCONNECT, (reason) => {
            console.log(`❌ Desconectado del servidor de Spotify: ${reason}`);
            this.connected = false;
            this.reconnect();
        });
        
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.ERROR, (error) => {
            console.error('❌ Error de conexión con Spotify:', error);
            this.connected = false;
        });
        
        // Añadir manejo de error de conexión
        this.socket.on('connect_error', (error) => {
            console.error('❌ Error al intentar conectar con Spotify:', error.message);
            this.connected = false;
        });

        // Evento de canción reproducida - Con control de duplicados
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.SONG_PLAYED, (trackInfo) => {
            const currentTime = Date.now();
            const trackId = `${trackInfo?.name}-${trackInfo?.artists?.join(',')}`;

            // Verificar si es el mismo track y si no ha pasado suficiente tiempo
            if (this.lastTrackInfo === trackId && 
                currentTime - this.lastUpdateTime < this.DEBOUNCE_TIME) {
                console.log('[Spotify-Debug] Evento duplicado ignorado:', {
                    trackId,
                    timeSinceLastUpdate: currentTime - this.lastUpdateTime,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar el estado desde el store
            const store = useEventStore.getState();
            const spotifyConfig = store.eventConfigs.find(config => config.eventType === 'spotifySongPlayed');

            if (spotifyConfig?.enabled) {
                const messageForAssistant = `[Spotify] Reproduciendo: "${trackInfo?.name}" por ${trackInfo?.artists?.join(', ')}`;
                console.log('[Spotify-Debug] Emitiendo nuevo evento:', {
                    messageForAssistant,
                    trackId,
                    timestamp: new Date().toISOString()
                });
                
                // Actualizar control de duplicados
                this.lastTrackInfo = trackId;
                this.lastUpdateTime = currentTime;
                
                // Emitir al canal de mensajes aprobados
                eventBus.emit('approvedChatMessage', messageForAssistant);
            }
        });
    }

    // Métodos públicos para interactuar con el socket
    public disconnect(): void {
        this.socket?.disconnect();
    }

    private reconnectionAttempts = 0;
    private maxReconnectionAttempts = 10; // Límite de intentos de reconexión manual
    private reconnectionTimer: NodeJS.Timeout | null = null;

    public reconnect(): void {
        if (this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
        }

        // Si ya alcanzamos el máximo de intentos, no seguimos intentando
        if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
            console.log(`Máximo de intentos de reconexión (${this.maxReconnectionAttempts}) alcanzado. Verifica que el servidor de Spotify esté corriendo en ${SPOTIFY_SOCKET_CONFIG.SERVER_URL}`);
            return;
        }

        if (this.socket && !this.socket.connected) {
            this.reconnectionAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, this.reconnectionAttempts), 30000); // Backoff exponencial con máximo de 30 segundos
            
            console.log(`Intentando reconexión al servidor de Spotify... (Intento ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}, próximo intento en ${delay/1000}s)`);
            
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
}

export const spotifyService = SpotifyService.getInstance();
