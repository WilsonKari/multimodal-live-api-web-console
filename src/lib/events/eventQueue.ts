import { EventType } from './eventTypes';

const queue: EventType[] = [];

export const eventQueue = {
  addEvent: (event: EventType) => {
    queue.push(event);
    console.log('[LOG 8] Event added to queue:', event);
  },
  getEvents: () => {
    return [...queue]; // Return a copy to avoid direct manipulation
  },
  removeEvent: () => {
    return queue.shift();
  },
  size: () => {
    return queue.length;
  },
};
