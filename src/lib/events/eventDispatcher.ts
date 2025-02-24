import { useEventStore } from './eventStore';
import { TiktokChatMessageEvent, SpotifySongPlayedEvent, EventType } from './eventTypes';
import { tiktokChatMessageSchema, passesFilter as chatPassesFilter } from './conditions/tiktokChatMessage';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';
import { ChatFilterConfig } from './types/chatConfig';

let eventSubscriptionsActive = false;

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: ChatFilterConfig | Record<string, any>;
}

const conditionMap = {
  tiktokChatMessage: tiktokChatMessageSchema,
  spotifySongPlayed: spotifySongPlayedSchema,
};

type ConditionTypes = keyof typeof conditionMap;

function passesFilter<T extends EventType>(
  eventType: ConditionTypes,
  eventData: T,
  filterParams: ChatFilterConfig | Record<string, any>
): boolean {
  if (eventType === 'tiktokChatMessage') {
    return chatPassesFilter(eventData as TiktokChatMessageEvent, filterParams as ChatFilterConfig);
  }
  return true;
}

function processEvent(eventData: EventType) {
  try {
    if (eventData.eventType === 'tiktokChatMessage') {
      const chatEvent = eventData as TiktokChatMessageEvent;
      const messageForAssistant = `[${chatEvent.nickname}]: ${chatEvent.comment}`;
      eventBus.emit('approvedChatMessage', messageForAssistant);
    }
  } catch (error) {
    console.error('[Process] Error al procesar evento:', error);
  }
}

export function eventDispatcher(eventData: any, eventType: string) {
  const store = useEventStore.getState();
  const { isAssistantSpeaking, eventConfigs } = store;
  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  if (!eventConfig || !eventConfig.enabled) {
    return;
  }

  const passes = passesFilter(
    eventType as ConditionTypes, 
    eventData, 
    eventConfig.filterParameters
  );

  if (!passes) {
    return;
  }

  if (isAssistantSpeaking) {
    eventQueue.addEvent(eventData);
  } else {
    processEvent(eventData);
  }
}

function updateEventSubscriptions() {
  const store = useEventStore.getState();
  const { eventConfigs } = store;

  if (eventSubscriptionsActive) {
    eventBus.removeAllListeners('tiktokChatMessage');
    eventBus.removeAllListeners('spotifySongPlayed');
    eventSubscriptionsActive = false;
  }

  eventConfigs.forEach(config => {
    if (config.enabled) {
      eventBus.on(config.eventType, (data) => {
        eventDispatcher(data, config.eventType);
      });
    }
  });

  eventSubscriptionsActive = true;
}

useEventStore.subscribe(() => {
  updateEventSubscriptions();
});

updateEventSubscriptions();

export { updateEventSubscriptions };
