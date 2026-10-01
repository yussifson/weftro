import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useSpeechRecognition({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(false);
  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const finalTranscriptRef = useRef(''); // accumulates only final words
  const interimTranscriptRef = useRef(''); // current interim (for display)

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSupport(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // clear language to avoid mis-recognition
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
          let interimText = '';
          let newFinalText = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              newFinalText += result[0].transcript;
            } else {
              interimText += result[0].transcript;
            }
          }

          // Append finalized words to our running total
          if (newFinalText) {
            finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + newFinalText.trim();
          }
          interimTranscriptRef.current = interimText;

          // Pass the combined final + interim to the parent so typing input shows live feedback
          const combined = (finalTranscriptRef.current + (interimText ? ' ' + interimText : '')).trim();
          if (onTranscriptRef.current) {
            onTranscriptRef.current(combined, newFinalText.trim(), interimText.trim());
          }
        };

        recognition.onerror = (event) => {
          if (event.error === 'no-speech') return; // silent — just timed out
          if (event.error === 'aborted') return; // user stopped
          console.warn('Speech recognition error:', event.error);
          toast.error(`Microphone error: ${event.error}. Please try again.`);
          setIsListening(false);
        };

        recognition.onend = () => {
          // If still supposed to be listening (e.g. browser auto-stopped after silence), restart
          if (recognitionRef.current?._shouldContinue) {
            try { recognition.start(); } catch (e) { setIsListening(false); }
          } else {
            setIsListening(false);
          }
        };
      }
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current._shouldContinue = false;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current._shouldContinue = false;
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      // Reset accumulators
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    } else {
      // Request mic permission explicitly so user sees the prompt
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        toast.error('Microphone access is blocked. Please allow microphone access in your browser settings.');
        return;
      }

      // Reset transcript accumulators on fresh start
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';

      recognitionRef.current._shouldContinue = true;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Listening... speak now', { duration: 1500 });
      } catch (e) {
        toast.error('Could not start microphone. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current._shouldContinue = false;
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    }
  };

  return {
    isListening,
    hasSupport,
    toggleListening,
    stopListening
  };
}
