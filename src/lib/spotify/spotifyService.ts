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
    private processedTracks: Set<string> = new Set(); // Conjunto para registrar tracks procesados
    private cleanupInterval: NodeJS.Timeout | null = null;
    private readonly TRACK_HISTORY_EXPIRY = 300000; // 5 minutos para olvidar tracks procesados
    private readonly MAX_HISTORY_SIZE = 100; // Máximo número de tracks a mantener en historial

    private constructor() {
        this.initializeSocket();
        this.setupTrackHistoryCleanup();
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

        // Evento de canción reproducida - Con control de duplicados mejorado
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.SONG_PLAYED, (trackInfo) => {
            const currentTime = Date.now();
            const trackId = `${trackInfo?.name}-${trackInfo?.artists?.join(',')}`;
            const trackIdWithTimestamp = `${trackId}|${currentTime}`;
            
            // Sistema mejorado anti-duplicados con múltiples verificaciones:
            
            // 1. Verificar si es el mismo track recibido recientemente (debounce)
            if (this.lastTrackInfo === trackId && 
                currentTime - this.lastUpdateTime < this.DEBOUNCE_TIME) {
                console.log('[Spotify-Debug] Evento duplicado ignorado (debounce):', {
                    trackId,
                    timeSinceLastUpdate: currentTime - this.lastUpdateTime,
                    timestamp: new Date().toISOString()
                });
                return;
            }
            
            // 2. Verificar en el registro histórico si ya hemos procesado este track recientemente
            const recentDuplicate = Array.from(this.processedTracks).some(item => {
                const [storedTrackId, timestampStr] = item.split('|');
                const timestamp = parseInt(timestampStr);
                // Considerar duplicado si es el mismo track y no han pasado más de 30 segundos
                return storedTrackId === trackId && currentTime - timestamp < 30000;
            });
            
            if (recentDuplicate) {
                console.log('[Spotify-Debug] Evento duplicado ignorado (historial):', {
                    trackId,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Verificar el estado desde el store
            const store = useEventStore.getState();
            const spotifyConfig = store.eventConfigs.find(config => config.eventType === 'spotifySongPlayed');

            if (spotifyConfig?.enabled) {
                console.log('[Spotify-Debug] Procesando nuevo evento de Spotify:', {
                    trackName: trackInfo?.name,
                    artistName: trackInfo?.artists?.join(', '),
                    trackId,
                    timestamp: new Date().toISOString()
                });
                
                // Actualizar control de duplicados
                this.lastTrackInfo = trackId;
                this.lastUpdateTime = currentTime;
                this.processedTracks.add(trackIdWithTimestamp);
                
                // Enviar directamente al SidePanel mediante approvedChatMessage
                // Para asegurar que no pase por la cola y llegue inmediatamente
                const messageForAssistant = `[Spotify] Reproduciendo: "${trackInfo?.name}" por ${trackInfo?.artists?.join(', ')}`;
                
                // Solo emitimos el mensaje directamente para que llegue al SidePanel
                // Evitamos emitir spotifySongPlayed para prevenir duplicación
                eventBus.emit('approvedChatMessage', messageForAssistant);
                
                console.log('[Spotify-Debug] Mensaje enviado directamente a SidePanel:', {
                    message: messageForAssistant,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log('[Spotify-Debug] Evento ignorado porque spotifySongPlayed está desactivado');
            }
        });
    }

    private setupTrackHistoryCleanup(): void {
        // Configurar limpieza periódica de historial para evitar consumo excesivo de memoria
        this.cleanupInterval = setInterval(() => {
            // Limpiar tracks antiguos para prevenir crecimiento ilimitado de memoria
            const now = Date.now();
            const tracksToRemove: string[] = [];
            
            // Identificar tracks antiguos para eliminar
            this.processedTracks.forEach(trackIdWithTimestamp => {
                const [, timestamp] = trackIdWithTimestamp.split('|');
                if (now - parseInt(timestamp) > this.TRACK_HISTORY_EXPIRY) {
                    tracksToRemove.push(trackIdWithTimestamp);
                }
            });
            
            // Eliminar tracks antiguos
            tracksToRemove.forEach(track => {
                this.processedTracks.delete(track);
            });
            
            console.log('[Spotify-Debug] Limpieza de historial de tracks:', {
                removedTracks: tracksToRemove.length,
                remainingTracks: this.processedTracks.size,
                timestamp: new Date().toISOString()
            });
            
            // Si aún queda un número excesivo de tracks, eliminar los más antiguos
            if (this.processedTracks.size > this.MAX_HISTORY_SIZE) {
                const trackArray = Array.from(this.processedTracks);
                trackArray.sort((a, b) => {
                    const timestampA = parseInt(a.split('|')[1]);
                    const timestampB = parseInt(b.split('|')[1]);
                    return timestampA - timestampB;
                });
                
                const tracksToKeep = trackArray.slice(-this.MAX_HISTORY_SIZE);
                this.processedTracks = new Set(tracksToKeep);
                
                console.log('[Spotify-Debug] Limpieza adicional por tamaño máximo:', {
                    newSize: this.processedTracks.size,
                    timestamp: new Date().toISOString()
                });
            }
        }, 60000); // Ejecutar cada minuto
    }

    // Métodos públicos para interactuar con el socket
    public disconnect(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
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
