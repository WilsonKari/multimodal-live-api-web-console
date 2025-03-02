import React, { useState, useEffect } from 'react';
import { IoClose } from 'react-icons/io5';
import './EventConfigModal.scss';

// Comentada la importación del tipo ChatFilterConfig ya que está relacionada con TikTok
// import { ChatFilterConfig } from '../../../../../lib/events/types/chatConfig';

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
  console.log('[Modal Debug] Modal montado con props:', {
    isOpen,
    eventType,
    currentConfig
  });

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

  const [filters, setFilters] = useState<ChatFilterConfig>(currentConfig || defaultFilters);
  const [isSaving, setIsSaving] = useState(false);

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  // Usar currentConfig cuando cambie
  useEffect(() => {
    console.log('[Modal Debug] Config actualizada:', currentConfig);
    setFilters(currentConfig || defaultFilters);
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    console.log('[Modal Debug] Iniciando guardado:', {
      filters,
      eventType
    });
    try {
      await onSave(filters);
      console.log('[Modal Debug] Guardado exitoso');
      onClose();
    } catch (error) {
      console.error('[Modal Debug] Error al guardar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFollowerRole = (role: 'noFollow' | 'follower' | 'friend') => {
    console.log('[Modal Debug] Cambiando rol:', role);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        followerRole: {
          ...prev.followerRole,
          [role]: !prev.followerRole[role]
        }
      };
      console.log('[Modal Debug] Nuevo estado de filtros:', newFilters);
      return newFilters;
    });
  };

  const toggleUserStatus = (status: 'moderator' | 'subscriber' | 'newDonor') => {
    console.log('[Modal Debug] Cambiando estado de usuario:', status);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        userStatus: {
          ...prev.userStatus,
          [status]: !prev.userStatus[status]
        }
      };
      console.log('[Modal Debug] Nuevo estado de filtros:', newFilters);
      return newFilters;
    });
  };

  const handleDonorRangeChange = (min: number, max: number) => {
    console.log('[Modal Debug] Cambiando rango de donante:', { min, max });
    setFilters(prev => {
      const newFilters = {
        ...prev,
        donorRange: {
          ...prev.donorRange,
          unrestricted: false,
          min,
          max
        }
      };
      console.log('[Modal Debug] Nuevo estado de filtros:', newFilters);
      return newFilters;
    });
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
            {/* 
              Estos controles son específicos para la configuración de TikTok,
              pero los mantenemos comentados para futuras referencias
            */}
            {eventType !== 'spotifySongPlayed' && (
              <>
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
              </>
            )}

            {eventType === 'spotifySongPlayed' && (
              <div className="filter-section spotify-section">
                <h3>Configuración de Spotify</h3>
                <p>No hay opciones de configuración disponibles para este evento.</p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div className="left-buttons">
              <button type="button" className="reset" onClick={handleReset} disabled={eventType === 'spotifySongPlayed'}>
                Reset
              </button>
            </div>
            <div className="right-buttons">
              <button 
                type="button" 
                className="cancel" 
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="save" 
                disabled={isSaving || eventType === 'spotifySongPlayed'}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventConfigModal;
