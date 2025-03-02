import { useEffect } from 'react';
import { useEventStore } from './eventStore';
import { spotifyService } from '../spotify/spotifyService';

export function AssistantSpeakingHandler() {
  const { setIsAssistantSpeaking } = useEventStore();

  useEffect(() => {
    const handleAssistantSpeakingStarted = () => {
      setIsAssistantSpeaking(true);
      console.log('[Assistant] Asistente empezó a hablar, pausando eventos');
    };

    const handleAssistantSpeakingEnded = () => {
      setIsAssistantSpeaking(false);
      console.log('[Assistant] Asistente terminó de hablar, reanudando eventos');
    };

    // Suscribirse a eventos de Spotify relacionados con el estado del asistente
    spotifyService.subscribe('assistantSpeakingStarted', handleAssistantSpeakingStarted);
    spotifyService.subscribe('assistantSpeakingEnded', handleAssistantSpeakingEnded);

    return () => {
      // Limpiar suscripciones al desmontar
      spotifyService.unsubscribe('assistantSpeakingStarted');
      spotifyService.unsubscribe('assistantSpeakingEnded');
    };
  }, [setIsAssistantSpeaking]);

  return null;
}
