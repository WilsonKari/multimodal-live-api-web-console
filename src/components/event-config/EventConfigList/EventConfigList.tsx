import React, { useState } from 'react';
import EventCard from './EventCard/EventCard';
import { useEventStore } from '../../../lib/events/eventStore';
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

  const handleConfigChange = (eventType: string, newConfig: any) => {
    setEventConfig(eventType, { filterParameters: newConfig });
  };

  const handleConfigure = (eventType: string) => {
    setSelectedEvent(eventType);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const currentConfig = eventConfigs.find(config => config.eventType === selectedEvent)?.filterParameters || {};

  return (
    <div className="event-config-list">
      <h2>Configuración de Eventos</h2>
      <div className="events-container">
        {eventConfigs.map((config) => (
          <EventCard
            key={config.eventType}
            eventType={config.eventType}
            enabled={config.enabled}
            filterParameters={config.filterParameters}
            onToggle={() => handleToggle(config.eventType)}
            onConfigChange={(newConfig) => handleConfigChange(config.eventType, newConfig)}
            onConfigure={() => handleConfigure(config.eventType)}
          />
        ))}
      </div>

      {selectedEvent && (
        <EventConfigModal
          isOpen={true}
          onClose={handleCloseModal}
          onSave={(newConfig) => handleConfigChange(selectedEvent, newConfig)}
          eventType={selectedEvent}
          currentConfig={currentConfig}
        />
      )}
    </div>
  );
};

export default EventConfigList;
