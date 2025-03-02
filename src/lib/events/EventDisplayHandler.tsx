import React, { useEffect, useState } from 'react';
import { useEventStore } from './eventStore';
import { eventQueue } from './eventQueue';
import { EventType, SpotifySongPlayedEvent } from './eventTypes';
import eventBus from './eventBus';

export const EventDisplayHandler: React.FC = () => {
  const { isAssistantSpeaking } = useEventStore();
  const [queueStats, setQueueStats] = useState({
    totalEvents: 0,
    byType: {} as Record<string, number>,
    averageWaitTime: 0
  });

  // Procesar eventos en cola cuando el asistente no está hablando
  useEffect(() => {
    if (!isAssistantSpeaking) {
      processQueuedEvents();
    }
  }, [isAssistantSpeaking]);

  // Actualizar estadísticas de la cola
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = eventQueue.getStats();
      setQueueStats(stats);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const processQueuedEvents = () => {
    while (!isAssistantSpeaking && eventQueue.size() > 0) {
      const event = eventQueue.removeEvent();
      if (event) {
        processEvent(event);
      }
    }
  };

  const processEvent = (event: EventType) => {
    try {
      switch (event.eventType) {
        case 'spotifySongPlayed': {
          const songEvent = event as SpotifySongPlayedEvent;
          console.log('[EventDisplay] Evento de Spotify en cola detectado:', {
            track: songEvent.trackName,
            artist: songEvent.artistName,
            timestamp: new Date().toISOString()
          });
          
          // Ya no emitimos approvedChatMessage desde aquí porque:
          // 1. Los eventos de Spotify ahora se envían directamente al SidePanel desde spotifyService
          // 2. Esto evita potenciales duplicados por múltiples rutas de procesamiento
          console.log('[EventDisplay] Ignorando evento de Spotify en cola para evitar duplicados');
          
          break;
        }
        default: {
          console.log('[EventDisplay] Tipo de evento no manejado:', event.eventType);
          break;
        }
      }
    } catch (error) {
      console.error('[EventDisplay] Error al procesar evento:', error);
    }
  };

  // El componente no renderiza nada visible, pero procesa eventos en segundo plano
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
