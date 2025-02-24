import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import './EventConfigModal.scss';

import { ChatFilterConfig } from '../../../../../lib/events/types/chatConfig';

interface EventConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ChatFilterConfig) => void;
  eventType: string;
  currentConfig: ChatFilterConfig;
}

export const EventConfigModal: React.FC<EventConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  eventType,
  currentConfig
}) => {
  const defaultFilters: ChatFilterConfig = {
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

  const [filters, setFilters] = useState<ChatFilterConfig>(defaultFilters);

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(filters);
  };

  const toggleFollowerRole = (role: 'noFollow' | 'follower' | 'friend') => {
    setFilters(prev => ({
      ...prev,
      followerRole: {
        ...prev.followerRole,
        [role]: !prev.followerRole[role]
      }
    }));
  };

  const toggleUserStatus = (status: 'moderator' | 'subscriber' | 'newDonor') => {
    setFilters(prev => ({
      ...prev,
      userStatus: {
        ...prev.userStatus,
        [status]: !prev.userStatus[status]
      }
    }));
  };

  const handleDonorRangeChange = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      donorRange: {
        ...prev.donorRange,
        unrestricted: false,
        min,
        max
      }
    }));
  };

  const toggleUnrestricted = () => {
    setFilters(prev => ({
      ...prev,
      donorRange: {
        ...prev.donorRange,
        unrestricted: !prev.donorRange.unrestricted
      }
    }));
  };

  return (
    <div className="event-config-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Configurar Evento: {eventType}</h2>
          <button className="close-button" onClick={onClose}>
            <IoClose />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="filter-section">
              <h3>Rol de Seguidor</h3>
              <div className="filter-buttons">
                <button 
                  type="button"
                  className={`filter-btn ${filters.followerRole.noFollow ? 'selected' : 'inactive'}`}
                  onClick={() => toggleFollowerRole('noFollow')}
                >
                  No Sigue
                </button>
                <button 
                  type="button"
                  className={`filter-btn ${filters.followerRole.follower ? 'selected' : 'inactive'}`}
                  onClick={() => toggleFollowerRole('follower')}
                >
                  Seguidor
                </button>
                <button 
                  type="button"
                  className={`filter-btn ${filters.followerRole.friend ? 'selected' : 'inactive'}`}
                  onClick={() => toggleFollowerRole('friend')}
                >
                  Amigo
                </button>
              </div>
            </div>

            <div className="filter-section">
              <h3>Estado del Usuario</h3>
              <div className="filter-buttons">
                <button 
                  type="button"
                  className={`filter-btn ${filters.userStatus.moderator ? 'selected' : 'inactive'}`}
                  onClick={() => toggleUserStatus('moderator')}
                >
                  Moderador
                </button>
                <button 
                  type="button"
                  className={`filter-btn ${filters.userStatus.subscriber ? 'selected' : 'inactive'}`}
                  onClick={() => toggleUserStatus('subscriber')}
                >
                  Suscriptor
                </button>
                <button 
                  type="button"
                  className={`filter-btn ${filters.userStatus.newDonor ? 'selected' : 'inactive'}`}
                  onClick={() => toggleUserStatus('newDonor')}
                >
                  Nuevo Donante
                </button>
              </div>
            </div>

            <div className="filter-section">
              <h3>Rango Mínimo de Donante</h3>
              <div className="range-control">
                <button 
                  type="button"
                  className={`filter-btn ${filters.donorRange.unrestricted ? 'selected' : ''}`}
                  onClick={toggleUnrestricted}
                >
                  Sin restricción
                </button>
                {!filters.donorRange.unrestricted && (
                  <div className="range-slider">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={filters.donorRange.min}
                      onChange={(e) => handleDonorRangeChange(parseInt(e.target.value), filters.donorRange.max)}
                    />
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={filters.donorRange.max}
                      onChange={(e) => handleDonorRangeChange(filters.donorRange.min, parseInt(e.target.value))}
                    />
                    <div className="range-values">
                      <span>{filters.donorRange.min}</span>
                      <span>{filters.donorRange.max}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div className="left-buttons">
              <button type="button" className="reset" onClick={handleReset}>
                Reset
              </button>
            </div>
            <div className="right-buttons">
              <button type="button" className="cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="save">
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventConfigModal;
