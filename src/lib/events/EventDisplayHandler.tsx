import React, { useEffect, useState } from 'react';
import { useEventStore } from './eventStore';
import { eventQueue } from './eventQueue';
import { EventType, TiktokChatMessageEvent, SpotifySongPlayedEvent } from './eventTypes';

export const EventDisplayHandler: React.FC = () => {
  const { isAssistantSpeaking } = useEventStore();
  const [queueStats, setQueueStats] = useState({
    totalEvents: 0,
    byType: {} as Record<string, number>,
    averageWaitTime: 0
  });

  // Procesar eventos en cola cuando el asistente deja de hablar
  useEffect(() => {
    if (!isAssistantSpeaking) {
      console.log('[Display] Asistente disponible, procesando cola...');
      processQueuedEvents();
    }
  }, [isAssistantSpeaking]);

  // Actualizar estadísticas periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = eventQueue.getStats();
      setQueueStats(stats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const processQueuedEvents = () => {
    let processedCount = 0;
    while (!isAssistantSpeaking && eventQueue.size() > 0) {
      const event = eventQueue.removeEvent();
      if (event) {
        processEvent(event);
        processedCount++;
      }
    }

    if (processedCount > 0) {
      console.log('[Display] Eventos procesados:', {
        count: processedCount,
        remainingInQueue: eventQueue.size()
      });
    }
  };

  const processEvent = (event: EventType) => {
    try {
      console.log('[Display] Procesando evento:', {
        type: event.eventType,
        timestamp: new Date().toISOString()
      });

      switch (event.eventType) {
        case 'tiktokChatMessage': {
          const chatEvent = event as TiktokChatMessageEvent;
          console.log('[Display] Mensaje de chat:', {
            message: chatEvent.comment,
            user: chatEvent.nickname,
            followRole: chatEvent.followRole,
            badges: chatEvent.userBadgeLevel
          });
          console.log('[Display] mensaje llegó al final', chatEvent);
          break;
        }

        case 'spotifySongPlayed': {
          const songEvent = event as SpotifySongPlayedEvent;
          console.log('[Display] Canción reproducida:', {
            track: songEvent.trackName,
            artist: songEvent.artistName,
            artwork: songEvent.albumArtUrl
          });
          break;
        }

        default: {
          const _exhaustiveCheck: never = event;
          console.log('[Display] Tipo de evento no manejado:', event);
        }
      }

    } catch (error) {
      console.error('[Display] Error al procesar evento:', error);
    }
  };

  // Renderizar información de la cola (para debugging)
  return (
    <div style={{ display: 'none' }}>
      <div>Cola de eventos: {queueStats.totalEvents}</div>
      <div>Tiempo promedio de espera: {queueStats.averageWaitTime.toFixed(2)}ms</div>
      <div>
        Eventos por tipo:
        {Object.entries(queueStats.byType).map(([type, count]) => (
          <div key={type}>{type}: {count}</div>
        ))}
      </div>
    </div>
  );
};
