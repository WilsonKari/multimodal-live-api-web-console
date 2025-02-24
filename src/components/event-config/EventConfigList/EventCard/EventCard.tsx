import React from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import { BsCircleFill } from 'react-icons/bs';
import './EventCard.scss';
import { ChatFilterConfig } from '../../../../lib/events/types/chatConfig';

type EventCardProps = {
  eventType: string;
  enabled: boolean;
  onToggle: () => void;
  onConfigure: () => void;
} & (
  | {
      eventType: 'tiktokChatMessage';
      onConfigChange: (config: ChatFilterConfig) => void;
      filterParameters: ChatFilterConfig;
    }
  | {
      eventType: string;
      onConfigChange: (config: Record<string, any>) => void;
      filterParameters: Record<string, any>;
    }
);

const EventCard: React.FC<EventCardProps> = ({
  eventType,
  enabled,
  onToggle,
  onConfigChange,
  filterParameters,
  onConfigure,
}) => {
  // Función para formatear el nombre del evento para mostrar
  const formatEventName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1') // Agrega espacios antes de las mayúsculas
      .replace(/^./, (str) => str.toUpperCase()); // Primera letra mayúscula
  };

  return (
    <div className="event-card">
      <div className="card-header">
        <h3>{formatEventName(eventType)}</h3>
      </div>

      <div className="card-content">
        <div className={`status-indicator ${enabled ? 'enabled' : 'disabled'}`}>
          <BsCircleFill size={10} />
          <span>{enabled ? 'Activo' : 'Inactivo'}</span>
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="toggle"
          onClick={onToggle}
        >
          {enabled ? 'Desactivar' : 'Activar'}
        </button>
        <button 
          className="configure"
          onClick={onConfigure}
        >
          <IoSettingsOutline /> Configurar
        </button>
      </div>
    </div>
  );
};

export default EventCard;
