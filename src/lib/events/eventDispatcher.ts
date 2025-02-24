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
  console.log('[Dispatch] Procesando evento:', {
    type: eventType,
    timestamp: new Date().toISOString()
  });

  const store = useEventStore.getState();
  const { isAssistantSpeaking, eventConfigs } = store;
  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  // Validación inicial
  if (!eventConfig) {
    console.log('[Dispatch] Evento no configurado:', eventType);
    return;
  }

  if (!eventConfig.enabled) {
    console.log('[Dispatch] Evento deshabilitado:', {
      type: eventType,
      config: eventConfig
    });
    return;
  }

  // Aplicar filtros
  console.log('[Dispatch] Aplicando filtros con configuración:', {
    type: eventType,
    filters: eventConfig.filterParameters
  });

  const passes = passesFilter(
    eventType as ConditionTypes, 
    eventData, 
    eventConfig.filterParameters
  );

  if (!passes) {
    console.log('[Dispatch] Evento filtrado por configuración');
    return;
  }

  // Procesar evento
  if (isAssistantSpeaking) {
    console.log('[Dispatch] Asistente hablando, encolando evento');
    
    eventQueue.addEvent(eventData);
    
    // Mostrar estadísticas de la cola
    const stats = eventQueue.getStats();
    console.log('[Dispatch] Estado actual de la cola:', stats);
  } else {
    console.log('[Dispatch] Procesando evento inmediatamente');
    processEvent(eventData);
  }

  console.log('[Dispatch] Procesamiento completado');
}

function processEvent(eventData: EventType) {
  try {
    // Aquí iría la lógica para mostrar el evento en la UI
    console.log('[Dispatch] Evento procesado:', {
      type: eventData.eventType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Dispatch] Error al procesar evento:', error);
  }
}

// Suscribirse a eventos del eventBus
eventBus.on('tiktokChatMessage', (data) => {
  eventDispatcher(data, 'tiktokChatMessage');
});

eventBus.on('spotifySongPlayed', (data) => {
  eventDispatcher(data, 'spotifySongPlayed');
});
