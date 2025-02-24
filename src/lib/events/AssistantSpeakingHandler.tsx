import { useEffect } from 'react';
import { useEventStore } from './eventStore';
import { tiktokService } from '../tiktok/tiktokService';
import { spotifyService } from '../spotify/spotifyService';

export function AssistantSpeakingHandler() {
  const { setIsAssistantSpeaking } = useEventStore();

  useEffect(() => {
    const handleAssistantSpeakingStarted = () => {
      setIsAssistantSpeaking(true);
    };

    const handleAssistantSpeakingEnded = () => {
      setIsAssistantSpeaking(false);
    };

    tiktokService.subscribe('assistantSpeakingStarted', handleAssistantSpeakingStarted);
    spotifyService.subscribe('assistantSpeakingStarted', handleAssistantSpeakingStarted);

    tiktokService.subscribe('assistantSpeakingEnded', handleAssistantSpeakingEnded);
    spotifyService.subscribe('assistantSpeakingEnded', handleAssistantSpeakingEnded);

    return () => {
      tiktokService.unsubscribe('assistantSpeakingStarted');
      spotifyService.unsubscribe('assistantSpeakingStarted');
      tiktokService.unsubscribe('assistantSpeakingEnded');
      spotifyService.unsubscribe('assistantSpeakingEnded');
    };
  }, [setIsAssistantSpeaking]);

  return null;
}
