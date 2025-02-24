import { useEventStore } from './eventStore';
import { TiktokChatMessageEvent, SpotifySongPlayedEvent, EventType } from './eventTypes';
import { tiktokChatMessageSchema, passesFilter as chatPassesFilter } from './conditions/tiktokChatMessage';
import { spotifySongPlayedSchema } from './conditions/spotifySongPlayed';
import { eventQueue } from './eventQueue';
import eventBus from './eventBus';
import { ChatFilterConfig } from './types/chatConfig';

// Mantener un registro del estado de suscripción
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
  console.log('[Filter] 🔍 Evaluando filtros para evento:', {
    type: eventType,
    data: eventData,
    params: filterParams,
    timestamp: new Date().toISOString()
  });

  if (eventType === 'tiktokChatMessage') {
    const passes = chatPassesFilter(eventData as TiktokChatMessageEvent, filterParams as ChatFilterConfig);
    console.log('[Filter] 📋 Resultado del filtro de chat:', {
      passed: passes,
      filters: filterParams,
      message: (eventData as TiktokChatMessageEvent).comment,
      user: (eventData as TiktokChatMessageEvent).nickname,
      eventData: eventData // Agregando el objeto completo para depuración
    });
    return passes;
  }

  console.log('[Filter] ⚠️ Tipo de evento no implementado:', eventType);
  return true;
}

export function eventDispatcher(eventData: any, eventType: string) {
  console.log('[Dispatch] 📥 Recibido evento:', {
    type: eventType,
    data: eventData,
    timestamp: new Date().toISOString()
  });

  const store = useEventStore.getState();
  const { isAssistantSpeaking, eventConfigs } = store;
  
  console.log('[Dispatch] 🔄 Estado actual:', {
    isAssistantSpeaking,
    configs: eventConfigs.map(c => ({
      type: c.eventType,
      enabled: c.enabled,
      hasFilters: !!c.filterParameters
    }))
  });

  const eventConfig = eventConfigs.find((config: EventConfig) => config.eventType === eventType);

  // Validación inicial
  if (!eventConfig) {
    console.log('[Dispatch] ❌ Evento no configurado:', eventType);
    return;
  }

  if (!eventConfig.enabled) {
    console.log('[Dispatch] ⏸️ Evento deshabilitado:', {
      type: eventType,
      config: eventConfig
    });
    return;
  }

  // Aplicar filtros
  console.log('[Dispatch] 🔍 Aplicando filtros con configuración:', {
    type: eventType,
    filters: eventConfig.filterParameters
  });

  const passes = passesFilter(
    eventType as ConditionTypes, 
    eventData, 
    eventConfig.filterParameters
  );

  if (!passes) {
    console.log('[Dispatch] ⛔ Evento filtrado por configuración');
    return;
  }

  // Procesar evento
  if (isAssistantSpeaking) {
    console.log('[Dispatch] ⏳ Asistente hablando, encolando evento');
    eventQueue.addEvent(eventData);
    
    // Mostrar estadísticas de la cola
    const stats = eventQueue.getStats();
    console.log('[Dispatch] 📊 Estado actual de la cola:', stats);
  } else {
    console.log('[Dispatch] ✅ Procesando evento inmediatamente');
    processEvent(eventData);
  }

  console.log('[Dispatch] 🏁 Procesamiento completado');
}

function processEvent(eventData: EventType) {
  try {
    console.log('[Process] 🎯 Evento siendo procesado:', {
      type: eventData.eventType,
      data: eventData,
      timestamp: new Date().toISOString()
    });

    // Verificar específicamente eventos de chat
    if (eventData.eventType === 'tiktokChatMessage') {
      const chatEvent = eventData as TiktokChatMessageEvent;
      const messageForAssistant = `[${chatEvent.nickname}]: ${chatEvent.comment}`;
      
      console.log('[Process] 📨 Preparando mensaje para asistente:', {
        message: messageForAssistant,
        timestamp: new Date().toISOString()
      });
      
      eventBus.emit('approvedChatMessage', messageForAssistant);
      
      console.log('[Process] ✅ Mensaje emitido al eventBus');
    }
  } catch (error) {
    console.error('[Process] 🔴 Error al procesar evento:', error);
  }
}

// Función para manejar suscripciones basadas en el estado enabled
function updateEventSubscriptions() {
  const store = useEventStore.getState();
  const { eventConfigs } = store;

  console.log('[EventDispatcher] 🔄 Actualizando suscripciones de eventos');

  // Primero, remover todas las suscripciones existentes
  if (eventSubscriptionsActive) {
    console.log('[EventDispatcher] 🔍 Removiendo suscripciones anteriores');
    eventBus.off('tiktokChatMessage', (data) => {
      eventDispatcher(data, 'tiktokChatMessage');
    });
    eventBus.off('spotifySongPlayed', (data) => {
      eventDispatcher(data, 'spotifySongPlayed');
    });
    eventSubscriptionsActive = false;
  }

  // Crear nuevas suscripciones solo para eventos habilitados
  eventConfigs.forEach(config => {
    if (config.enabled) {
      console.log(`[EventDispatcher] ✅ Habilitando suscripción para: ${config.eventType}`);
      eventBus.on(config.eventType, (data) => {
        eventDispatcher(data, config.eventType);
      });
    } else {
      console.log(`[EventDispatcher] ⛔ Evento deshabilitado, no se suscribe: ${config.eventType}`);
    }
  });

  eventSubscriptionsActive = true;
}

// Suscribirse a eventos del eventBus
eventBus.on('tiktokChatMessage', (data) => {
  eventDispatcher(data, 'tiktokChatMessage');
});

eventBus.on('spotifySongPlayed', (data) => {
  eventDispatcher(data, 'spotifySongPlayed');
});

// Escuchar cambios en la configuración de eventos
useEventStore.subscribe((state) => {
  console.log('[EventDispatcher] 📢 Detectado cambio en configuración de eventos');
  updateEventSubscriptions();
});

// Inicializar suscripciones
updateEventSubscriptions();

// Exportar la función de actualización para uso externo si es necesario
export { updateEventSubscriptions };
