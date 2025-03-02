// Definiciones básicas de eventos
interface BaseEvent { 
  eventType: string; 
  timestamp: number; 
  priority: number; 
} 

// Evento de spotify
export interface SpotifySongPlayedEvent extends BaseEvent { 
  eventType: 'spotifySongPlayed'; 
  trackName: string | undefined; 
  artistName: string | undefined; 
  albumArtUrl: string | undefined; 
} 

// Comentado el evento de TikTok para evitar errores de compilación
/* export interface TiktokChatMessageEvent extends BaseEvent {
  eventType: 'tiktokChatMessage';
  comment: string;
  uniqueId: string;
  nickname: string;
  followRole: number;
  userBadgeLevel?: number;
  isModerator: boolean;
  isNewGifter: boolean;
  isSubscriber: boolean;
  topGifterRank?: number;
} */

// Tipo de unión para todos los eventos
export type EventType = SpotifySongPlayedEvent; // Solo Spotify es válido ahora
