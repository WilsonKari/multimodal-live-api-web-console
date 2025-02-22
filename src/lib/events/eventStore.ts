import { create } from 'zustand';

interface EventConfig {
  eventType: string;
  enabled: boolean;
  filterParameters: any;
}

interface EventStoreState {
  eventConfigs: EventConfig[];
  isAssistantSpeaking: boolean;
  setEventConfig: (eventType: string, config: Partial<EventConfig>) => void;
  setIsAssistantSpeaking: (speaking: boolean) => void;
}

export const useEventStore = create<EventStoreState>((set) => ({
  eventConfigs: [
    // Initial event configurations (can also be loaded from eventsConfig.ts)
    { eventType: 'tiktokChatMessage', enabled: true, filterParameters: {} },
    { eventType: 'spotifySongPlayed', enabled: true, filterParameters: {} },
  ],
  isAssistantSpeaking: false,
  setEventConfig: (eventType, config) =>
    set((state) => ({
      eventConfigs: state.eventConfigs.map((eventConfig) =>
        eventConfig.eventType === eventType ? { ...eventConfig, ...config } : eventConfig
      ),
    })),
  setIsAssistantSpeaking: (speaking) => set({ isAssistantSpeaking: speaking }),
}));
