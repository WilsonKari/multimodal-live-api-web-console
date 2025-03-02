import { useEventStore } from './eventStore';
import { SpotifySongPlayedEvent, EventType } from './eventTypes';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';

let eventSubscriptionsActive = false;
let currentSubscriptions: string[] = [];

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: Record<string, any>;
}

const conditionMap = {
  spotifySongPlayed: spotifySongPlayedSchema,
};

type ConditionTypes = keyof typeof conditionMap;

function isEventEnabled(eventType: string): boolean {
  const store = useEventStore.getState();
  const config = store.eventConfigs.find((config: EventConfig) => config.eventType === eventType);
  const enabled = config?.enabled || false;

  console.log('[LOG] Verificación de estado en dispatcher:', {
    eventType,
    enabled,
    configFound: !!config,
    timestamp: new Date().toISOString()
  });

  return enabled;
}

function processEvent(eventData: EventType) {
  try {
    console.log('[LOG] Iniciando procesamiento de evento:', {
      eventType: eventData.eventType,
      timestamp: new Date().toISOString()
    });

    // Procesar eventos de Spotify
    if (eventData.eventType === 'spotifySongPlayed') {
      const songEvent = eventData as SpotifySongPlayedEvent;
      // Formatear la información del song para el SidePanel
      const messageForAssistant = `[Spotify]: Ahora suena "${songEvent.trackName}" de ${songEvent.artistName}`;
      console.log('[LOG] Emitiendo mensaje de Spotify:', {
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
  console.log('[LOG] Dispatcher recibió evento:', {
    eventType,
    eventData,
    timestamp: new Date().toISOString()
  });

  if (!isEventEnabled(eventType)) {
    console.log('[LOG] Evento bloqueado en verificación:', {
      eventType,
      timestamp: new Date().toISOString()
    });
    return;
  }

  const store = useEventStore.getState();
  const { isAssistantSpeaking, eventConfigs } = store;
  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  if (!eventConfig || !eventConfig.enabled) {
    console.log('[LOG] Evento bloqueado por falta de configuración:', {
      eventType,
      eventConfigFound: !!eventConfig,
      enabled: eventConfig?.enabled,
      timestamp: new Date().toISOString()
    });
    return;
  }

  console.log('[LOG] Evento pasa verificaciones, procesando:', {
    eventType,
    isAssistantSpeaking,
    timestamp: new Date().toISOString()
  });

  if (isAssistantSpeaking) {
    console.log('[LOG] Añadiendo evento a la cola porque el asistente está hablando:', {
      eventType,
      timestamp: new Date().toISOString()
    });
    eventQueue.addEvent(eventData);
  } else {
    console.log('[LOG] Procesando evento inmediatamente:', {
      eventType,
      timestamp: new Date().toISOString()
    });
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
