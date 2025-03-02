import React from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import { BsCircleFill } from 'react-icons/bs';
import './EventCard.scss';
// Comentada la importación del tipo ChatFilterConfig
// import { ChatFilterConfig } from '../../../../lib/events/types/chatConfig';

// Definir tipo ChatFilterConfig localmente para evitar dependencias
interface ChatFilterConfig {
  followerRole: {
    noFollow: boolean;
    follower: boolean;
    friend: boolean;
  };
  userStatus: {
    moderator: boolean;
    subscriber: boolean;
    newDonor: boolean;
  };
  donorRange: {
    unrestricted: boolean;
    min: number;
    max: number;
  };
}

type EventCardProps = {
  eventType: string;
  enabled: boolean;
  onToggle: () => void;
  onConfigure: () => void;
  onConfigChange: (config: Record<string, any>) => void;
  filterParameters: Record<string, any>;
};

// Comentado el tipo unión para TikTok
/* type EventCardProps = {
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
); */

const EventCard: React.FC<EventCardProps> = ({
  eventType,
  enabled,
  onToggle,
  onConfigChange,
  filterParameters,
  onConfigure,
}) => {
  const formatEventName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
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
          className={`toggle ${enabled ? 'enabled' : 'disabled'}`}
          onClick={handleToggle}
        >
          {enabled ? 'Desactivar' : 'Activar'}
        </button>
        {eventType !== 'spotifySongPlayed' && (
          <button 
            className="configure"
            onClick={onConfigure}
          >
            <IoSettingsOutline /> Configurar
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;
