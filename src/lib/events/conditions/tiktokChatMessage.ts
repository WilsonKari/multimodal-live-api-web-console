import { TiktokChatMessageEvent } from "../eventTypes";
import { ChatFilterConfig, ChatFilterRules } from "../types/chatConfig";

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
export function passesFilter(
  event: TiktokChatMessageEvent,
  uiConfig: ChatFilterConfig
): boolean {
  console.log('[LOG 7.2] Evaluando mensaje:', {
    uniqueId: event.uniqueId,
    nickname: event.nickname,
    followRole: event.followRole,
    badges: event.userBadgeLevel,
    isMod: event.isModerator,
    isNewGifter: event.isNewGifter,
    isSubscriber: event.isSubscriber
  });

  if (!event) {
    console.log('[LOG 7.3] Evento nulo, filtro fallido');
    return false;
  }

  const rules = transformUIConfigToSchema(uiConfig);

  // Validar followRole
  if (rules.followRole.length > 0) {
    const followRolePass = rules.followRole.includes(event.followRole || 0);
    console.log('[LOG 7.4] Check followRole:', {
      allowed: rules.followRole,
      actual: event.followRole,
      passed: followRolePass
    });
    if (!followRolePass) return false;
  }

  // Validar userBadgeLevel
  if (rules.userBadgeLevel !== undefined) {
    const badgeLevelPass = event.userBadgeLevel !== undefined && 
                          event.userBadgeLevel >= rules.userBadgeLevel;
    console.log('[LOG 7.5] Check badgeLevel:', {
      minRequired: rules.userBadgeLevel,
      actual: event.userBadgeLevel,
      passed: badgeLevelPass
    });
    if (!badgeLevelPass) return false;
  }

  // Validar isModerator
  if (rules.isModerator !== undefined) {
    const modPass = event.isModerator === rules.isModerator;
    console.log('[LOG 7.6] Check moderator:', {
      required: rules.isModerator,
      actual: event.isModerator,
      passed: modPass
    });
    if (!modPass) return false;
  }

  // Validar isNewGifter
  if (rules.isNewGifter !== undefined) {
    const gifterPass = event.isNewGifter === rules.isNewGifter;
    console.log('[LOG 7.7] Check newGifter:', {
      required: rules.isNewGifter,
      actual: event.isNewGifter,
      passed: gifterPass
    });
    if (!gifterPass) return false;
  }

  // Validar isSubscriber
  if (rules.isSubscriber !== undefined) {
    const subPass = event.isSubscriber === rules.isSubscriber;
    console.log('[LOG 7.8] Check subscriber:', {
      required: rules.isSubscriber,
      actual: event.isSubscriber,
      passed: subPass
    });
    if (!subPass) return false;
  }

  console.log('[LOG 7.9] Mensaje pasó todos los filtros');
  return true;
}
