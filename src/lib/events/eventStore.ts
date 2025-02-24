import { create } from 'zustand';
import { ChatFilterConfig } from './types/chatConfig';

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

export const useEventStore = create<EventStoreState>((set) => ({
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
      console.log('[Store] Iniciando actualización de configuración:', {
        eventType,
        updateType: config.enabled !== undefined ? 'Toggle' : 'FilterUpdate',
        timestamp: new Date().toISOString()
      });

      const updatedConfigs = state.eventConfigs.map((eventConfig) => {
        if (eventConfig.eventType === eventType) {
          // Si es una actualización de filtros para el chat
          if (config.filterParameters && eventType === 'tiktokChatMessage') {
            console.log('[Store] Actualizando filtros de chat:', {
              currentFilters: eventConfig.filterParameters,
              newFilters: config.filterParameters,
              isValidConfig: isChatConfig(config.filterParameters)
            });

            const updatedConfig = {
              ...eventConfig,
              ...config,
              filterParameters: {
                ...eventConfig.filterParameters,
                ...(isChatConfig(config.filterParameters) ? config.filterParameters : {})
              }
            };

            console.log('[Store] Configuración de chat actualizada:', updatedConfig);
            return updatedConfig;
          }
          
          // Para otros tipos de eventos
          console.log('[Store] Actualizando configuración general');
          return { ...eventConfig, ...config };
        }
        return eventConfig;
      });

      console.log('[Store] Estado actualizado:', {
        configsUpdated: updatedConfigs.length,
        timestamp: new Date().toISOString()
      });

      return { eventConfigs: updatedConfigs };
    }),
  setIsAssistantSpeaking: (speaking) => {
    console.log('[Store] Actualizando estado del asistente:', {
      speaking,
      timestamp: new Date().toISOString()
    });
    set({ isAssistantSpeaking: speaking });
  },
}));
