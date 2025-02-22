import React, { useState } from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import EventConfigList from '../EventConfigList/EventConfigList';
import './EventPanel.scss';

interface EventPanelProps {
  className?: string;
}

const EventPanel: React.FC<EventPanelProps> = ({ className = '' }) => {
  const [showEvents, setShowEvents] = useState(false);

  return (
    <>
      <button 
        className="events-button"
        onClick={() => setShowEvents(!showEvents)}
      >
        <IoSettingsOutline />
        <span>Eventos</span>
      </button>

      <div className={`events-overlay ${showEvents ? 'open' : ''} ${className}`}>
        <div className="events-header">
          <h2>Configuración de Eventos</h2>
        </div>
        <div className="events-content">
          <EventConfigList />
        </div>
      </div>
    </>
  );
};

export default EventPanel;
