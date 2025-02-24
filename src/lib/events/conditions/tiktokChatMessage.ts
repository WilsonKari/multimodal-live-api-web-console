import { TiktokChatMessageEvent } from '../eventTypes';
import { ChatFilterConfig, ChatFilterRules } from '../types/chatConfig';

export const tiktokChatMessageSchema = {
  followRole: {
    type: 'number',
    label: 'Follow Role',
    description: 'Only show messages from users with these follow roles (0, 1, or 2).',
    isArray: true,
  },
  userBadgeLevel: {
    type: 'number',
    label: 'User Badge Level',
    description: 'Only show messages from users with this badge level or higher.',
  },
  isModerator: {
    type: 'boolean',
    label: 'Is Moderator',
    description: 'Only show messages from moderators.',
  },
  isNewGifter: {
    type: 'boolean',
    label: 'Is New Gifter',
    description: 'Only show messages from new gifters.',
  },
  isSubscriber: {
    type: 'boolean',
    label: 'Is Subscriber',
    description: 'Only show messages from subscribers.',
  },
};

/**
 * Transforma la configuración de la UI en reglas de filtrado
 * @param uiConfig Configuración de la UI
 * @returns Reglas de filtrado
 */
function transformUIConfigToSchema(uiConfig: ChatFilterConfig): ChatFilterRules {
  console.log('[LOG 7.0] Transformando configuración UI:', uiConfig);
  
  const rules: ChatFilterRules = {
    followRole: [
      ...(uiConfig.followerRole.noFollow ? [0] : []),
      ...(uiConfig.followerRole.follower ? [1] : []),
      ...(uiConfig.followerRole.friend ? [2] : [])
    ],
    userBadgeLevel: uiConfig.donorRange.unrestricted ? 
      undefined : 
      uiConfig.donorRange.min,
    isModerator: uiConfig.userStatus.moderator ? true : undefined,
    isNewGifter: uiConfig.userStatus.newDonor ? true : undefined,
    isSubscriber: uiConfig.userStatus.subscriber ? true : undefined
  };

  console.log('[LOG 7.1] Reglas transformadas:', rules);
  return rules;
}

/**
 * Verifica si un mensaje de chat cumple con las reglas de filtrado
 * @param event Evento de chat
 * @param uiConfig Configuración de filtros de la UI
 * @returns true si el mensaje pasa los filtros, false en caso contrario
 */
export function passesFilter(event: TiktokChatMessageEvent, config: ChatFilterConfig): boolean {
  console.log('[ChatFilter] 🔍 Evaluando mensaje:', {
    message: event.comment,
    user: event.nickname,
    timestamp: new Date().toISOString()
  });

  // Verificar rol de seguidor
  const followRolePass = config.followerRole.noFollow && event.followRole === 0 ||
                        config.followerRole.follower && event.followRole === 1 ||
                        config.followerRole.friend && event.followRole === 2;

  console.log('[ChatFilter] 👥 Evaluación de rol de seguidor:', {
    userRole: event.followRole,
    allowedRoles: config.followerRole,
    passed: followRolePass
  });

  if (!followRolePass) {
    console.log('[ChatFilter] ⛔ Mensaje filtrado por rol de seguidor');
    return false;
  }

  // Verificar estado del usuario
  // Si todos los estados están permitidos, permitir cualquier mensaje
  const allStatusAllowed = config.userStatus.moderator && 
                          config.userStatus.subscriber && 
                          config.userStatus.newDonor;

  // Si no todos los estados están permitidos, verificar el estado específico
  const userStatusPass = allStatusAllowed || 
                        (event.isModerator && config.userStatus.moderator) ||
                        (event.isSubscriber && config.userStatus.subscriber) ||
                        (event.isNewGifter && config.userStatus.newDonor);

  console.log('[ChatFilter] 🎭 Evaluación de estado de usuario:', {
    isModerator: event.isModerator,
    isSubscriber: event.isSubscriber,
    isNewGifter: event.isNewGifter,
    allStatusAllowed: allStatusAllowed,
    allowedStatus: config.userStatus,
    passed: userStatusPass
  });

  if (!userStatusPass) {
    console.log('[ChatFilter] ⛔ Mensaje filtrado por estado de usuario');
    return false;
  }

  // Verificar rango de donante
  const donorRangePass = config.donorRange.unrestricted ||
                        (event.topGifterRank !== undefined &&
                         event.topGifterRank >= config.donorRange.min &&
                         event.topGifterRank <= config.donorRange.max);

  console.log('[ChatFilter] 🎁 Evaluación de rango de donante:', {
    userRank: event.topGifterRank,
    configRange: config.donorRange,
    passed: donorRangePass
  });

  if (!donorRangePass) {
    console.log('[ChatFilter] ⛔ Mensaje filtrado por rango de donante');
    return false;
  }

  console.log('[ChatFilter] ✅ Mensaje pasó todos los filtros');
  return true;
}
