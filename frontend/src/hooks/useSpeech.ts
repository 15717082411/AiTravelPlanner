import { useEffect, useState } from 'react';

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  let recognition: any;

  useEffect(() => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SR) {
      recognition = new SR();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (e: any) => {
        const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
        setTranscript(text);
      };
      recognition.onerror = (e: any) => setError(e.message || String(e));
      recognition.onend = () => setListening(false);
    }
    return () => { recognition && recognition.stop && recognition.stop(); };
  }, []);

  const start = () => {
    setTranscript('');
    setError(null);
    if (recognition) {
      setListening(true);
      recognition.start();
    } else {
      setError('当前浏览器不支持语音识别');
    }
  };
  const stop = () => { recognition && recognition.stop && recognition.stop(); };

  return { listening, transcript, start, stop, error };
}