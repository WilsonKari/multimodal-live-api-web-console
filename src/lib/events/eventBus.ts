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
        // Verificación especial para el evento approvedChatMessage si proviene de TikTok
        if (eventType === 'approvedChatMessage') {
            // Si el mensaje es de TikTok (comienza con "[" pero no con "[Spotify]")
            const message = args[0] as string;
            if (message && message.startsWith('[') && !message.startsWith('[Spotify]')) {
                // Verificar si el evento de TikTok está habilitado
                if (!this.isEventEnabled('tiktokChatMessage')) {
                    console.log('[EventBus] Bloqueando approvedChatMessage de TikTok porque el evento está deshabilitado:', {
                        message,
                        timestamp: new Date().toISOString()
                    });
                    return false;
                }
            }
            return super.emit(eventType, ...args);
        }
        
        // Si es un evento de Spotify o de cambio de estado, no aplicar verificación adicional
        if (eventType === 'spotifySongPlayed' || eventType === 'eventStateChanged') {
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
