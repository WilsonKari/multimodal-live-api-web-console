import React, { useState, useEffect, useMemo } from 'react';
import EventCard from './EventCard/EventCard';
import { useEventStore } from '../../../lib/events/eventStore';
import { ChatFilterConfig } from '../../../lib/events/types/chatConfig';
import './EventConfigList.scss';
import EventConfigModal from './EventCard/EventConfigModal/EventConfigModal';

const EventConfigList: React.FC = () => {
  const { eventConfigs, setEventConfig } = useEventStore();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleToggle = (eventType: string) => {
    const config = eventConfigs.find(config => config.eventType === eventType);
    if (config) {
      console.log('[UI List] Toggling event:', {
        eventType,
        currentState: config.enabled,
        newState: !config.enabled,
        timestamp: new Date().toISOString()
      });
      setEventConfig(eventType, { enabled: !config.enabled });
    }
  };

  const handleConfigChange = async (eventType: string, newConfig: ChatFilterConfig | Record<string, any>) => {
    try {
      setIsUpdating(true);
      console.log('[UI List] Iniciando actualización de configuración:', {
        eventType,
        configType: eventType === 'tiktokChatMessage' ? 'ChatMessage' : 'Other',
        timestamp: new Date().toISOString()
      });

      // Solo permitimos configuración de chat para eventos de tipo chat
      if (eventType === 'tiktokChatMessage' && 'followerRole' in newConfig) {
        console.log('[UI List] Actualizando configuración de chat:', {
          followRole: newConfig.followerRole,
          userStatus: newConfig.userStatus,
          donorRange: newConfig.donorRange
        });
        await setEventConfig(eventType, { filterParameters: newConfig as ChatFilterConfig });
        console.log('[UI List] Configuración de chat actualizada exitosamente');
      } else {
        await setEventConfig(eventType, { filterParameters: newConfig });
        console.log('[UI List] Configuración general actualizada');
      }
    } catch (error) {
      console.error('[UI List] Error al actualizar configuración:', error);
    } finally {
      console.log('[UI List] Finalizada actualización de configuración');
      setIsUpdating(false);
    }
  };

  // Efecto para monitorear cambios en las configuraciones
  useEffect(() => {
    console.log('[UI List] Estado actual de configuraciones:', 
      eventConfigs.map(config => ({
        type: config.eventType,
        enabled: config.enabled,
        hasFilters: Object.keys(config.filterParameters).length > 0,
        timestamp: new Date().toISOString()
      }))
    );
  }, [eventConfigs]);

  const handleConfigure = (eventType: string) => {
    console.log('[UI List] Abriendo configuración para evento:', {
      eventType,
      timestamp: new Date().toISOString()
    });
    setSelectedEvent(eventType);
  };

  const handleCloseModal = () => {
    console.log('[UI List] Cerrando modal de configuración');
    setSelectedEvent(null);
  };

  const selectedConfig = eventConfigs.find(config => config.eventType === selectedEvent);
  const currentConfig: ChatFilterConfig = useMemo(() => {
    if (selectedConfig?.eventType === 'tiktokChatMessage') {
      console.log('[UI List] Cargando configuración actual de chat');
      return selectedConfig.filterParameters as ChatFilterConfig;
    }
    console.log('[UI List] Usando configuración por defecto');
    return {
      followerRole: { noFollow: true, follower: true, friend: true },
      userStatus: { moderator: true, subscriber: true, newDonor: true },
      donorRange: { unrestricted: true, min: 0, max: 100 }
    };
  }, [selectedConfig]);

  return (
    <div className={`event-config-list ${isUpdating ? 'updating' : ''}`}>
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
