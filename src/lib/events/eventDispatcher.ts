import { useEventStore } from './eventStore';
import { TiktokChatMessageEvent, SpotifySongPlayedEvent, EventType } from './eventTypes';
import { tiktokChatMessageSchema, passesFilter as chatPassesFilter } from './conditions/tiktokChatMessage';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';
import { ChatFilterConfig } from './types/chatConfig';

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
  // Usar el filtro específico para mensajes de chat
  if (eventType === 'tiktokChatMessage') {
    return chatPassesFilter(
      eventData as TiktokChatMessageEvent, 
      filterParams as ChatFilterConfig
    );
  }
  
  // Para otros tipos de eventos, por ahora retornamos true
  return true;
}

export function eventDispatcher(eventData: any, eventType: string) {
  console.log(`[LOG 3] eventDispatcher called for ${eventType} with data:`, eventData);
  const { isAssistantSpeaking } = useEventStore.getState();
  const { eventConfigs } = useEventStore.getState();
  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  if (!eventConfig) {
    console.log(`[LOG 3.1] No configuration found for event type: ${eventType}`);
    return;
  }

  if (!eventConfig.enabled) {
    console.log(`[LOG 3.2] Event ${eventType} is disabled. Skipping processing.`);
    return;
  }

  console.log(`[LOG 4] Event ${eventType} is enabled. Proceeding with filtering.`);
  console.log('[LOG 4.1] Current filter parameters:', eventConfig.filterParameters);

  const passes = passesFilter(
    eventType as ConditionTypes, 
    eventData, 
    eventConfig.filterParameters
  );

  if (!passes) {
    console.log('[LOG 4.2] Event filtered out by configuration');
    return;
  }

  if (isAssistantSpeaking) {
    console.log('[LOG 5] Assistant is speaking, queueing event');
    eventQueue.addEvent(eventData);
  } else {
    console.log('[LOG 6] Assistant not speaking, displaying event directly');
    // TODO: Format and append to the "Type something..." text area directly
    console.log('Event data:', eventData);
  }

  console.log('[LOG 7] eventDispatcher completed processing');
}

// Suscribirse a eventos del eventBus
eventBus.on('tiktokChatMessage', (data) => {
  eventDispatcher(data, 'tiktokChatMessage');
});

eventBus.on('spotifySongPlayed', (data) => {
  eventDispatcher(data, 'spotifySongPlayed');
});
