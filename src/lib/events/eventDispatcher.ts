import { useEventStore } from './eventStore';
import { TiktokChatMessageEvent, SpotifySongPlayedEvent, EventType } from './eventTypes';
import { tiktokChatMessageSchema } from './conditions/tiktokChatMessage';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: any;
}

const conditionMap = {
  tiktokChatMessage: tiktokChatMessageSchema,
  spotifySongPlayed: spotifySongPlayedSchema,
};

type ConditionTypes = keyof typeof conditionMap;

function passesFilter<T extends EventType>(
  eventType: ConditionTypes,
  eventData: T,
  filterParams: any
): boolean {
  // TODO: Implement actual filtering logic based on the schema and filterParams
  // For now, just return true to allow all events
  return true;
}

export function eventDispatcher(eventData: any, eventType: string) {
  console.log(`[LOG 3] eventDispatcher called for ${eventType} with data:`, eventData);
  const { isAssistantSpeaking } = useEventStore.getState();
  const { eventConfigs } = useEventStore.getState();
  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  if (eventConfig?.enabled) {
    console.log(`[LOG 4] Event ${eventType} is enabled. Proceeding with filtering.`);
    if (passesFilter(eventType as ConditionTypes, eventData, eventConfig.filterParameters)) {
      if (!isAssistantSpeaking) {
        // TODO: Format and append to the "Type something..." text area directly
        console.log('Directly displaying event:', eventData);
      } else {
        eventQueue.addEvent(eventData);
      }
    }
  } else {
    console.log(`[LOG 5] Event ${eventType} is disabled. Skipping processing.`);
  }
  console.log('[LOG 6] eventDispatcher completed for:', eventType, eventData);
}

// Suscribirse a eventos del eventBus
eventBus.on('tiktokChatMessage', (data) => {
  eventDispatcher(data, 'tiktokChatMessage');
});

eventBus.on('spotifySongPlayed', (data) => {
  eventDispatcher(data, 'spotifySongPlayed');
});
