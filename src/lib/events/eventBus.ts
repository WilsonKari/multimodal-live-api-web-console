import { EventEmitter } from 'events';
import { useEventStore } from './eventStore';

class EventBus extends EventEmitter {
    isEventEnabled(eventType: string): boolean {
        // Para eventos de Spotify, solo verificamos en el store sin logs adicionales
        if (eventType === 'spotifySongPlayed') {
            const store = useEventStore.getState();
            const config = store.eventConfigs.find(config => config.eventType === eventType);
            return config?.enabled || false;
        }

        // Para otros eventos, mantenemos la lógica y logs existentes
        const store = useEventStore.getState();
        const config = store.eventConfigs.find(config => config.eventType === eventType);
        const enabled = config?.enabled || false;
        
        console.log('[LOG-4] Verificación de estado en eventBus:', {
            eventType,
            enabled,
            config,
            timestamp: new Date().toISOString()
        });
        
        return enabled;
    }

    emit(eventType: string, ...args: any[]): boolean {
        // Si es un evento de Spotify o de cambio de estado, no aplicar verificación adicional
        if (eventType === 'spotifySongPlayed' || eventType === 'eventStateChanged' || eventType === 'approvedChatMessage') {
            return super.emit(eventType, ...args);
        }

        // Para otros eventos, mantener la verificación y logs
        if (!this.isEventEnabled(eventType)) {
            console.log('[LOG-7] Evento bloqueado por eventBus:', {
                eventType,
                timestamp: new Date().toISOString()
            });
            return false;
        }
        return super.emit(eventType, ...args);
    }
}

const eventBus = new EventBus();

export default eventBus;
