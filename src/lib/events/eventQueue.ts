import { EventType } from './eventTypes';

interface QueuedEvent {
  event: EventType;
  timestamp: number;
  priority: number;
}

const queue: QueuedEvent[] = [];

export const eventQueue = {
  addEvent: (event: EventType) => {
    const queuedEvent: QueuedEvent = {
      event,
      timestamp: Date.now(),
      priority: event.eventType === 'tiktokChatMessage' ? 1 : 2
    };

    // Insertar ordenado por prioridad y timestamp
    const insertIndex = queue.findIndex(
      e => e.priority > queuedEvent.priority || 
          (e.priority === queuedEvent.priority && e.timestamp > queuedEvent.timestamp)
    );

    if (insertIndex === -1) {
      queue.push(queuedEvent);
    } else {
      queue.splice(insertIndex, 0, queuedEvent);
    }

    console.log('[Queue] Evento añadido:', {
      type: event.eventType,
      priority: queuedEvent.priority,
      queueSize: queue.length,
      timestamp: new Date(queuedEvent.timestamp).toISOString()
    });
  },

  getEvents: () => {
    console.log('[Queue] Consultando eventos:', {
      totalEvents: queue.length,
      types: queue.map(e => e.event.eventType)
    });
    return [...queue.map(qe => qe.event)];
  },

  removeEvent: () => {
    const removed = queue.shift();
    if (removed) {
      console.log('[Queue] Evento removido:', {
        type: removed.event.eventType,
        priority: removed.priority,
        queueSize: queue.length,
        waitTime: Date.now() - removed.timestamp
      });
      return removed.event;
    }
    return null;
  },

  size: () => {
    return queue.length;
  },

  clear: () => {
    const size = queue.length;
    queue.length = 0;
    console.log('[Queue] Cola limpiada:', { previousSize: size });
  },

  getStats: () => {
    const stats = {
      totalEvents: queue.length,
      byType: {} as Record<string, number>,
      averageWaitTime: 0
    };

    queue.forEach(qe => {
      stats.byType[qe.event.eventType] = (stats.byType[qe.event.eventType] || 0) + 1;
      stats.averageWaitTime += Date.now() - qe.timestamp;
    });

    if (queue.length > 0) {
      stats.averageWaitTime /= queue.length;
    }

    console.log('[Queue] Estadísticas:', stats);
    return stats;
  }
};
