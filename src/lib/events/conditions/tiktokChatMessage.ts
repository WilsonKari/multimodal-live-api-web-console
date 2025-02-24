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

function transformUIConfigToSchema(uiConfig: ChatFilterConfig): ChatFilterRules {  
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

  return rules;
}

export function passesFilter(event: TiktokChatMessageEvent, config: ChatFilterConfig): boolean {
  // Verificar rol de seguidor
  const followRolePass = config.followerRole.noFollow && event.followRole === 0 ||
                        config.followerRole.follower && event.followRole === 1 ||
                        config.followerRole.friend && event.followRole === 2;

  if (!followRolePass) {
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

  if (!userStatusPass) {
    return false;
  }

  // Verificar rango de donante
  const donorRangePass = config.donorRange.unrestricted ||
                        (event.topGifterRank !== undefined &&
                         event.topGifterRank >= config.donorRange.min &&
                         event.topGifterRank <= config.donorRange.max);

  if (!donorRangePass) {
    return false;
  }

  return true;
}
