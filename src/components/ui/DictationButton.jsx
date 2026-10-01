import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function DictationButton({ onResult, isRecording, setIsRecording }) {
  const { toast } = useToast();
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          onResult(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
          toast({ title: 'Dictation Error', description: event.error, variant: 'destructive' });
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onResult, setIsRecording, toast]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Not Supported', description: 'Your browser does not support AI Dictation.', variant: 'destructive' });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast({ title: 'AI Dictation Started', description: 'Speak clearly into your microphone.' });
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleDictation}
      className={`p-2 rounded-full transition-all flex items-center justify-center ${isRecording ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
      title={isRecording ? "Stop Dictation" : "Start AI Dictation"}
    >
      {isRecording ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}
