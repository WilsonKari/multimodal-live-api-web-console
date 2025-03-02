import React from 'react';
import { IoSettingsOutline } from 'react-icons/io5';
import { BsCircleFill } from 'react-icons/bs';
import './EventCard.scss';
// Importar el tipo ChatFilterConfig
import { ChatFilterConfig } from '../../../../lib/events/types/chatConfig';
import eventBus from '../../../../lib/events/eventBus';
import { TikTokService } from '../../../../lib/tiktok/tiktokService';

// Ya no necesitamos definir localmente ChatFilterConfig pues lo importamos

// Descomentar el tipo unión para TikTok
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
  const formatEventName = (name: string) => {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Log extra para TikTok
    if (eventType === 'tiktokChatMessage') {
      console.log('[TikTok-EventCard] Estado actual antes de toggle:', {
        enabled,
        eventEnabled: eventBus.isEventEnabled('tiktokChatMessage'),
        timestamp: new Date().toISOString()
      });
      
      // Comprobar si después del toggle el evento estará habilitado
      setTimeout(() => {
        const newState = !enabled;
        console.log('[TikTok-EventCard] Estado después de toggle:', {
          nuevoEstado: newState,
          eventEnabled: eventBus.isEventEnabled('tiktokChatMessage'),
          timestamp: new Date().toISOString()
        });
        
        // Si se está activando, enviar un mensaje de prueba
        if (newState) {
          // Esperar más tiempo para que el socket se conecte adecuadamente
          setTimeout(() => {
            try {
              const tikTokService = TikTokService.getInstance();
              console.log('[TikTok-EventCard] Estado del servicio antes de simulación:', {
                eventListenersActive: tikTokService.isEventListenerActive(),
                socketConnected: tikTokService.isConnected(),
                eventEnabled: eventBus.isEventEnabled('tiktokChatMessage'),
                timestamp: new Date().toISOString()
              });
              
              // Simular un mensaje después de más tiempo para dar tiempo a que se conecte el socket
              setTimeout(() => {
                if (eventBus.isEventEnabled('tiktokChatMessage') && tikTokService.isConnected()) {
                  console.log('[TikTok-EventCard] Enviando mensaje de prueba...');
                  tikTokService.simulateChatMessage('TestUser', 'Este es un mensaje de prueba desde la activación del evento');
                } else {
                  console.log('[TikTok-EventCard] No se pudo enviar mensaje de prueba, el evento sigue desactivado o el socket no está conectado:', {
                    eventEnabled: eventBus.isEventEnabled('tiktokChatMessage'),
                    socketConnected: tikTokService.isConnected()
                  });
                }
              }, 2000); // Esperar 2 segundos para que el socket se conecte
            } catch (err) {
              console.error('[TikTok-EventCard] Error al intentar simular mensaje:', err);
            }
          }, 1000); // Esperar 1 segundo para que se estabilice el estado
        }
      }, 100);
    }
    
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
