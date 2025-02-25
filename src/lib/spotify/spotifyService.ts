import { io, Socket } from 'socket.io-client';
import { SPOTIFY_SOCKET_CONFIG } from './spotifyConfig';
import eventBus from '../events/eventBus';
import { useEventStore } from '../events/eventStore';

export class SpotifyService {
    private socket: Socket | null = null;
    private static instance: SpotifyService;

    private constructor() {
        this.initializeSocket();
        this.reconnect();
    }

    public static getInstance(): SpotifyService {
        if (!SpotifyService.instance) {
            SpotifyService.instance = new SpotifyService();
        }
        return SpotifyService.instance;
    }

    private initializeSocket(): void {
        this.socket = io(SPOTIFY_SOCKET_CONFIG.SERVER_URL, {
            reconnectionAttempts: SPOTIFY_SOCKET_CONFIG.RECONNECTION_ATTEMPTS,
            reconnectionDelay: SPOTIFY_SOCKET_CONFIG.RECONNECTION_DELAY,
            autoConnect: false
        });

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if (!this.socket) return;

        // Eventos de conexión básica
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.CONNECT, () => {});
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.DISCONNECT, () => {
            this.reconnect();
        });
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.ERROR, (error) => {
            console.error('Error de conexión:', error);
        });

        // Evento de canción reproducida - Verificación directa del estado
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.SONG_PLAYED, (trackInfo) => {
            // Verificar el estado directamente desde el store
            const store = useEventStore.getState();
            const spotifyConfig = store.eventConfigs.find(config => config.eventType === 'spotifySongPlayed');

            if (spotifyConfig?.enabled) {
                const messageForAssistant = `[Spotify] Reproduciendo: "${trackInfo?.name}" por ${trackInfo?.artists?.join(', ')}`;
                // Emitir directamente al canal de mensajes aprobados
                eventBus.emit('approvedChatMessage', messageForAssistant);
            }
        });
    }

    // Métodos públicos para interactuar con el socket
    public disconnect(): void {
        this.socket?.disconnect();
    }

    public reconnect(): void {
        if (this.socket && !this.socket.connected) {
            console.log('Intentando reconexión al servidor de Spotify...');
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

export const spotifyService = SpotifyService.getInstance();
