import { TiktokChatMessageEvent } from "../eventTypes";

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

export function passesFilter(
  event: TiktokChatMessageEvent,
  filterParams: any
): boolean {
  console.log('[LOG 7] passesFilter called with filterParams:', filterParams);
  if (!event) return false;

  if (filterParams.followRole !== undefined && !Array.isArray(filterParams.followRole)) {
    return false;
  }

  if (filterParams.followRole !== undefined && !filterParams.followRole.includes(event.followRole)) {
    return false;
  }

  if (filterParams.userBadgeLevel !== undefined && (event.userBadgeLevel === undefined || event.userBadgeLevel < filterParams.userBadgeLevel)) {
    return false;
  }

  if (filterParams.isModerator !== undefined && event.isModerator !== filterParams.isModerator) {
    return false;
  }

  if (filterParams.isNewGifter !== undefined && event.isNewGifter !== filterParams.isNewGifter) {
    return false;
  }

  if (filterParams.isSubscriber !== undefined && event.isSubscriber !== filterParams.isSubscriber) {
    return false;
  }

  return true;
}
