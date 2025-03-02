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
      priority: 1  // Todos los eventos tienen la misma prioridad
    };

    // Agregar evento a la cola en orden cronológico
    queue.push(queuedEvent);
  },

  getEvents: () => {
    return [...queue.map(qe => qe.event)];
  },

  removeEvent: () => {
    const removed = queue.shift();
    if (removed) {
      return removed.event;
    }
    return null;
  },

  size: () => {
    return queue.length;
  },

  clear: () => {
    queue.length = 0;
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

    return stats;
  }
};
