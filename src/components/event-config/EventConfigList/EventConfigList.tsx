import React, { useState } from 'react';
import EventCard from './EventCard/EventCard';
import { useEventStore } from '../../../lib/events/eventStore';
import { ChatFilterConfig } from '../../../lib/events/types/chatConfig';
import './EventConfigList.scss';
import EventConfigModal from './EventCard/EventConfigModal/EventConfigModal';

const EventConfigList: React.FC = () => {
  const { eventConfigs, setEventConfig } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const handleToggle = (eventType: string) => {
    const config = eventConfigs.find(config => config.eventType === eventType);
    if (config) {
      setEventConfig(eventType, { enabled: !config.enabled });
    }
  };

  const handleConfigChange = (eventType: string, newConfig: ChatFilterConfig | Record<string, any>) => {
    // Solo permitimos configuración de chat para eventos de tipo chat
    if (eventType === 'tiktokChatMessage' && 'followerRole' in newConfig) {
      setEventConfig(eventType, { filterParameters: newConfig as ChatFilterConfig });
    } else {
      setEventConfig(eventType, { filterParameters: newConfig });
    }
  };

  const handleConfigure = (eventType: string) => {
    setSelectedEvent(eventType);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const selectedConfig = eventConfigs.find(config => config.eventType === selectedEvent);
  const currentConfig: ChatFilterConfig = selectedConfig?.eventType === 'tiktokChatMessage' 
    ? selectedConfig.filterParameters as ChatFilterConfig
    : {
        followerRole: { noFollow: true, follower: true, friend: true },
        userStatus: { moderator: true, subscriber: true, newDonor: true },
        donorRange: { unrestricted: true, min: 0, max: 100 }
      };

  return (
    <div className="event-config-list">
      <h2>Configuración de Eventos</h2>
      <div className="events-container">
        {eventConfigs.map((config) => {
          if (config.eventType === 'tiktokChatMessage') {
            return (
              <EventCard
                key={config.eventType}
                eventType="tiktokChatMessage"
                enabled={config.enabled}
                filterParameters={config.filterParameters as ChatFilterConfig}
                onToggle={() => handleToggle(config.eventType)}
                onConfigChange={(newConfig: ChatFilterConfig) => handleConfigChange(config.eventType, newConfig)}
                onConfigure={() => handleConfigure(config.eventType)}
              />
            );
          }
          return (
            <EventCard
              key={config.eventType}
              eventType={config.eventType}
              enabled={config.enabled}
              filterParameters={config.filterParameters}
              onToggle={() => handleToggle(config.eventType)}
              onConfigChange={(newConfig: Record<string, any>) => handleConfigChange(config.eventType, newConfig)}
              onConfigure={() => handleConfigure(config.eventType)}
            />
          );
        })}
      </div>

      {selectedEvent && (
        <EventConfigModal
          isOpen={true}
          onClose={handleCloseModal}
          onSave={(newConfig: ChatFilterConfig) => handleConfigChange(selectedEvent, newConfig)}
          eventType={selectedEvent}
          currentConfig={currentConfig}
        />
      )}
    </div>
  );
};

export default EventConfigList;
