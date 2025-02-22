import { io, Socket } from 'socket.io-client';
import { SPOTIFY_SOCKET_CONFIG } from './spotifyConfig';
import eventBus from '../events/eventBus';

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
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.CONNECT, () => {
            console.log('✅ Conectado al servidor de Spotify');
        });

        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.DISCONNECT, () => {
            console.log('❌ Desconectado del servidor de Spotify');
            // Intentar reconexión automática
            this.reconnect();
        });

        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.ERROR, (error) => {
            console.error('🔴 Error en la conexión:', error);
        });

        // Evento de canción reproducida
        this.socket.on(SPOTIFY_SOCKET_CONFIG.EVENTS.SONG_PLAYED, (trackInfo) => {
            console.log('[LOG 1] Spotify song played:', {
                name: trackInfo?.name,
                artists: trackInfo?.artists,
                image_url: trackInfo?.image_url
            });
            
            // Emitir el evento a través del eventBus
            eventBus.emit('spotifySongPlayed', trackInfo);
            console.log('[LOG 2] Emitiendo spotifySongPlayed event a través de eventBus');
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
