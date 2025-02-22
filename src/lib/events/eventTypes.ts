interface BaseEvent {
  eventType: string;
  timestamp: number;
  priority: number;
}

export interface TiktokChatMessageEvent extends BaseEvent {
  eventType: 'tiktokChatMessage';
  comment: string | undefined;
  uniqueId: string | undefined;
  nickname: string | undefined;
  followRole: number | undefined;
  userBadgeLevel: number | undefined;
  isModerator: boolean | undefined;
  isNewGifter: boolean | undefined;
  isSubscriber: boolean | undefined;
  topGifterRank: number | undefined;
}

export interface SpotifySongPlayedEvent extends BaseEvent {
  eventType: 'spotifySongPlayed';
  trackName: string | undefined;
  artistName: string | undefined;
  albumArtUrl: string | undefined;
}

export type EventType = TiktokChatMessageEvent | SpotifySongPlayedEvent;
