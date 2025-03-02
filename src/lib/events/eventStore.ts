import { create } from 'zustand';
import eventBus from './eventBus';

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: Record<string, any>;
}

interface EventStoreState {
  eventConfigs: EventConfig[];
  isAssistantSpeaking: boolean;
  setEventConfig: (eventType: string, config: Partial<EventConfig>) => void;
  setIsAssistantSpeaking: (speaking: boolean) => void;
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  eventConfigs: [
    { 
      eventType: 'spotifySongPlayed', 
      enabled: true, 
      filterParameters: {} 
    },
    { 
      eventType: 'tiktokChatMessage', 
      enabled: true, 
      filterParameters: {
        followerRole: {
          noFollow: true,
          follower: true,
          friend: true
        },
        userStatus: {
          moderator: true,
          subscriber: true,
          newDonor: true
        },
        donorRange: {
          unrestricted: true,
          min: 0,
          max: 100
        }
      } 
    }
  ],
  isAssistantSpeaking: false,
  setEventConfig: (eventType, config) =>
    set((state) => {
      const updatedConfigs = state.eventConfigs.map((eventConfig) => {
        if (eventConfig.eventType === eventType) {
          const newConfig = { ...eventConfig, ...config };
          
          // Si se está actualizando enabled, emitir evento de cambio
          if (config.enabled !== undefined && config.enabled !== eventConfig.enabled) {
            eventBus.emit('eventStateChanged', {
              eventType,
              enabled: config.enabled
            });

            console.log('[EventStore] Estado del evento actualizado:', {
              eventType,
              prevEnabled: eventConfig.enabled,
              newEnabled: config.enabled,
              timestamp: new Date().toISOString()
            });
          }
          
          return newConfig;
        }
        return eventConfig;
      });

      return { eventConfigs: updatedConfigs };
    }),
  setIsAssistantSpeaking: (speaking) =>
    set({ isAssistantSpeaking: speaking }),
}));
