export const SPOTIFY_SOCKET_CONFIG = {
    SERVER_URL: 'http://localhost:8081',
    RECONNECTION_ATTEMPTS: 5,
    RECONNECTION_DELAY: 1000,
    EVENTS: {
        // Eventos de conexión básica
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        ERROR: 'error',
        // Evento de Spotify
        SONG_PLAYED: 'player_state_update'
    }
} as const;
