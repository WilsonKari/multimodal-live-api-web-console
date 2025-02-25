import { useEventStore } from './eventStore';
import { TiktokChatMessageEvent, SpotifySongPlayedEvent, EventType } from './eventTypes';
import { tiktokChatMessageSchema, passesFilter as chatPassesFilter } from './conditions/tiktokChatMessage';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';
import { ChatFilterConfig } from './types/chatConfig';

let eventSubscriptionsActive = false;
let currentSubscriptions: string[] = [];

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

function isEventEnabled(eventType: string): boolean {
  const store = useEventStore.getState();
  const config = store.eventConfigs.find((config: EventConfig) => config.eventType === eventType);
  const enabled = config?.enabled || false;

  console.log('[LOG-3] Verificación de estado en dispatcher:', {
    eventType,
    enabled,
    configFound: !!config,
    timestamp: new Date().toISOString()
  });

  return enabled;
}

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
    console.log('[LOG-5] Iniciando procesamiento de evento:', {
      eventType: eventData.eventType,
      timestamp: new Date().toISOString()
    });

    // No procesar eventos de Spotify aquí, ya que se manejan directamente
    if (eventData.eventType === 'spotifySongPlayed') {
      return;
    }

    // Verificar nuevamente el estado antes de procesar
    if (!isEventEnabled(eventData.eventType)) {
      console.log('[LOG-6] Evento bloqueado en processEvent:', {
        eventType: eventData.eventType,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (eventData.eventType === 'tiktokChatMessage') {
      const chatEvent = eventData as TiktokChatMessageEvent;
      const messageForAssistant = `[${chatEvent.nickname}]: ${chatEvent.comment}`;
      console.log('[LOG-8] Emitiendo mensaje aprobado:', {
        message: messageForAssistant,
        timestamp: new Date().toISOString()
      });
      eventBus.emit('approvedChatMessage', messageForAssistant);
    }
  } catch (error) {
    console.error('Error al procesar evento:', error);
  }
}

export function eventDispatcher(eventData: any, eventType: string) {
  console.log('[LOG-1] Dispatcher recibió evento:', {
    eventType,
    timestamp: new Date().toISOString()
  });

  // Para Spotify, solo verificamos si está habilitado
  if (eventType === 'spotifySongPlayed') {
    // No necesitamos procesar nada más para Spotify
    return;
  }

  // El resto del procesamiento solo para eventos de TikTok
  if (!isEventEnabled(eventType)) {
    console.log('[LOG-2] Evento bloqueado en primera verificación:', {
      eventType,
      timestamp: new Date().toISOString()
    });
    return;
  }

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

function cleanupSubscriptions() {
  currentSubscriptions.forEach(eventType => {
    eventBus.removeAllListeners(eventType);
  });
  currentSubscriptions = [];
  eventSubscriptionsActive = false;
}

function updateEventSubscriptions() {
  const store = useEventStore.getState();
  const { eventConfigs } = store;

  // Limpiar suscripciones existentes
  cleanupSubscriptions();

  // Crear nuevas suscripciones solo para eventos habilitados
  eventConfigs.forEach(config => {
    if (config.enabled) {
      eventBus.on(config.eventType, (data) => {
        eventDispatcher(data, config.eventType);
      });
      currentSubscriptions.push(config.eventType);
    }
  });

  eventSubscriptionsActive = true;
}

// Suscribirse a cambios en la configuración
useEventStore.subscribe((state) => {
  updateEventSubscriptions();
});

// Suscribirse a eventos de cambio de estado
eventBus.on('eventStateChanged', () => {
  updateEventSubscriptions();
});

// Inicializar suscripciones
updateEventSubscriptions();

export { updateEventSubscriptions, isEventEnabled };
