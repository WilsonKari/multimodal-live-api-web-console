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

  useEffect(() => {
    if (!isAssistantSpeaking) {
      processQueuedEvents();
    }
  }, [isAssistantSpeaking]);

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
        case 'tiktokChatMessage': {
          const chatEvent = event as TiktokChatMessageEvent;
          break;
        }
        case 'spotifySongPlayed': {
          const songEvent = event as SpotifySongPlayedEvent;
          break;
        }
        default: {
          const _exhaustiveCheck: never = event;
        }
      }
    } catch (error) {
      console.error('Error al procesar evento:', error);
    }
  };

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
