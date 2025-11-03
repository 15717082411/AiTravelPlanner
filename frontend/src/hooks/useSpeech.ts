import { useEffect, useRef, useState } from 'react';

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      console.warn('浏览器不支持 Web Speech API，后续可接入科大讯飞 SDK');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      const text = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.stop?.();
      recognitionRef.current = null;
    };
  }, []);

  const start = () => {
    recognitionRef.current?.start?.();
    setListening(true);
  };
  const stop = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  return { listening, transcript, start, stop };
}