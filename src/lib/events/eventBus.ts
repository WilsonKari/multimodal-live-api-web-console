import { EventEmitter } from 'events';
import { useEventStore } from './eventStore';

class EventBus extends EventEmitter {
    isEventEnabled(eventType: string): boolean {
        // Verificamos en el store si el evento está habilitado
        const store = useEventStore.getState();
        const config = store.eventConfigs.find(config => config.eventType === eventType);
        const enabled = config?.enabled || false;
        
        console.log('[LOG] Verificación de estado en eventBus:', {
            eventType,
            enabled,
            config,
            timestamp: new Date().toISOString()
        });
        
        return enabled;
    }

    emit(eventType: string, ...args: any[]): boolean {
        // Si es un evento de cambio de estado, no aplicar verificación adicional
        if (eventType === 'eventStateChanged') {
            console.log('[LOG] Emitiendo evento de cambio de estado:', {
                eventType,
                args: args[0],
                timestamp: new Date().toISOString()
            });
            return super.emit(eventType, ...args);
        }

        // Para el evento spotifySongPlayed, verificar si está activado
        if (eventType === 'spotifySongPlayed') {
            if (this.isEventEnabled(eventType)) {
                console.log('[LOG] Emitiendo evento spotifySongPlayed:', {
                    eventType,
                    args: args[0],
                    timestamp: new Date().toISOString()
                });
                return super.emit(eventType, ...args);
            } else {
                console.log('[LOG] Bloqueando evento spotifySongPlayed por estar desactivado');
                return false;
            }
        }

        // Para el evento tiktokChatMessage, verificar si está activado
        if (eventType === 'tiktokChatMessage') {
            if (this.isEventEnabled(eventType)) {
                console.log('[LOG] Emitiendo evento tiktokChatMessage:', {
                    eventType,
                    args: args[0],
                    timestamp: new Date().toISOString()
                });
                return super.emit(eventType, ...args);
            } else {
                console.log('[LOG] Bloqueando evento tiktokChatMessage por estar desactivado');
                return false;
            }
        }

        // Para el evento approvedChatMessage, verificar su origen
        if (eventType === 'approvedChatMessage') {
            const message = args[0];
            
            // Verificar si proviene de Spotify
            if (typeof message === 'string' && message.startsWith('[Spotify]')) {
                // Verificar si el evento de Spotify está activado
                if (this.isEventEnabled('spotifySongPlayed')) {
                    console.log('[LOG] Emitiendo mensaje de Spotify al SidePanel:', {
                        message,
                        timestamp: new Date().toISOString()
                    });
                    // Emitir directamente el mensaje cuando el evento está activado
                    return super.emit(eventType, ...args);
                } else {
                    console.log('[LOG] Bloqueando mensaje de Spotify por evento desactivado:', {
                        message,
                        timestamp: new Date().toISOString()
                    });
                    return false;
                }
            }
            
            // Verificar si proviene de TikTok
            if (typeof message === 'string' && message.startsWith('[TikTok]')) {
                // Verificar si el evento de TikTok está activado
                if (this.isEventEnabled('tiktokChatMessage')) {
                    console.log('[LOG] Emitiendo mensaje de TikTok al SidePanel:', {
                        message,
                        timestamp: new Date().toISOString()
                    });
                    // Emitir directamente el mensaje cuando el evento está activado
                    return super.emit(eventType, ...args);
                } else {
                    console.log('[LOG] Bloqueando mensaje de TikTok por evento desactivado:', {
                        message,
                        timestamp: new Date().toISOString()
                    });
                    return false;
                }
            }
        }

        // Para otros eventos, mantener la verificación y logs
        if (!this.isEventEnabled(eventType)) {
            console.log('[LOG] Evento bloqueado por eventBus:', {
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