import { create } from 'zustand';
import { ChatFilterConfig } from './types/chatConfig';
import eventBus from './eventBus';

// Configuración por defecto para el chat
const defaultChatConfig: ChatFilterConfig = {
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
};

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: ChatFilterConfig | Record<string, any>;
}

interface EventStoreState {
  eventConfigs: EventConfig[];
  isAssistantSpeaking: boolean;
  setEventConfig: (eventType: string, config: Partial<EventConfig>) => void;
  setIsAssistantSpeaking: (speaking: boolean) => void;
}

// Type guard para verificar si es configuración de chat
function isChatConfig(config: any): config is ChatFilterConfig {
  return config && 
         'followerRole' in config && 
         'userStatus' in config && 
         'donorRange' in config;
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  eventConfigs: [
    { 
      eventType: 'tiktokChatMessage', 
      enabled: true, 
      filterParameters: defaultChatConfig 
    },
    { 
      eventType: 'spotifySongPlayed', 
      enabled: true, 
      filterParameters: {} 
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
          }
          
          // Si son filtros de chat, manejarlos específicamente
          if (config.filterParameters && eventType === 'tiktokChatMessage') {
            return {
              ...newConfig,
              filterParameters: {
                ...eventConfig.filterParameters,
                ...(isChatConfig(config.filterParameters) ? config.filterParameters : {})
              }
            };
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
