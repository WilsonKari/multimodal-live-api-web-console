/**
 * Configuración de filtros para eventos de chat
 */
export interface ChatFilterConfig {
  followerRole: {
    noFollow: boolean;  // 0: no sigue
    follower: boolean;  // 1: sigue
    friend: boolean;    // 2: amigo
  };
  userStatus: {
    moderator: boolean;    // Usuario es moderador
    subscriber: boolean;   // Usuario es suscriptor
    newDonor: boolean;    // Usuario es nuevo donante
  };
  donorRange: {
    unrestricted: boolean; // Si es true, no aplica filtro de nivel
    min: number;          // Nivel mínimo de badge requerido
    max: number;          // Nivel máximo de badge permitido
  };
}

/**
 * Datos del mensaje de chat que llegan del servidor
 */
export interface ChatMessageData {
  comment: string;         // Contenido del mensaje
  uniqueId: string;       // ID único del usuario
  nickname: string;       // Nombre mostrado del usuario
  followRole: number;     // Rol de seguidor (0: no sigue, 1: sigue, 2: amigo)
  userBadges: Array<{
    level: number;        // Nivel de la insignia
  }>;
  isModerator: boolean;   // Si el usuario es moderador
  isNewGifter: boolean;   // Si el usuario es nuevo donante
  isSubscriber: boolean;  // Si el usuario es suscriptor
  topGifterRank: number; // Ranking del usuario como donante
}

/**
 * Resultado de la transformación de configuración UI a reglas de filtrado
 */
export interface ChatFilterRules {
  followRole: number[];          // Array de roles permitidos [0,1,2]
  userBadgeLevel?: number;       // Nivel mínimo de badge requerido
  isModerator?: boolean;         // Requerir que sea moderador
  isNewGifter?: boolean;         // Requerir que sea nuevo donante
  isSubscriber?: boolean;        // Requerir que sea suscriptor
}
