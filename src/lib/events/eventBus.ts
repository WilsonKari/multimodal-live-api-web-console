import { EventEmitter } from 'events';
import { useEventStore } from './eventStore';

class EventBus extends EventEmitter {
    isEventEnabled(eventType: string): boolean {
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
        if (eventType !== 'eventStateChanged' && !this.isEventEnabled(eventType)) {
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
