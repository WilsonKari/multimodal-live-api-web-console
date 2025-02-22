import { useEffect } from 'react';
import { useEventStore } from './eventStore';
import { tiktokService } from '../tiktok/tiktokService';
import { spotifyService } from '../spotify/spotifyService';

export function AssistantSpeakingHandler() {
  const { setIsAssistantSpeaking, isAssistantSpeaking } = useEventStore();

  useEffect(() => {
    console.log('AssistantSpeakingHandler mounted');

    const handleAssistantSpeakingStarted = () => {
      console.log('AssistantSpeakingHandler: assistantSpeakingStarted');
      setIsAssistantSpeaking(true);
    };

    const handleAssistantSpeakingEnded = () => {
      console.log('AssistantSpeakingHandler: assistantSpeakingEnded');
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

  console.log('AssistantSpeakingHandler isAssistantSpeaking:', isAssistantSpeaking);

  return null; // This component doesn't render anything
}
