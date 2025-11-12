import { useEffect, useRef, useState } from 'react';

type SpeechRecognitionCtor = typeof window extends { webkitSpeechRecognition: infer T } ? T : any;

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionCtorRef = useRef<SpeechRecognitionCtor | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  // 浏览器适配
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isFirefox = /firefox/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isChrome = /chrome/i.test(ua) && !isEdge;
  const isSafari = /safari/i.test(ua) && !isChrome && !isEdge;
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  useEffect(() => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setError('当前浏览器暂不支持语音识别');
      return;
    }
    recognitionCtorRef.current = SR;

    const onVisibility = () => {
      if (document.hidden && recognitionRef.current) {
        try { recognitionRef.current.abort?.(); } catch {}
        setListening(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop?.();
          recognitionRef.current.abort?.();
        } catch {}
        recognitionRef.current = null;
      }
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };
  }, []);

  const start = () => {
    if (listening) return;
    setTranscript('');
    setError(null);
    const Ctor = recognitionCtorRef.current;
    if (!Ctor) {
      setError('当前浏览器暂不支持语音识别');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop?.();
        recognitionRef.current.abort?.();
      } catch {}
    }

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = 'zh-CN';
    recognition.continuous = isFirefox || isSafari;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      try {
        const results = Array.from(e.results || []);
        const finals = results.filter((r: any) => r.isFinal).map((r: any) => r[0]?.transcript).filter(Boolean);
        if (finals.length) setTranscript(finals.join(' ').trim());
        else {
          const partial = results.map((r: any) => r[0]?.transcript).filter(Boolean).join(' ').trim();
          if (partial) setTranscript(partial);
        }
      } catch (err) {
        console.warn('Speech onresult parse error:', err);
      }
    };
    recognition.onerror = (e: any) => {
      const code: string = e?.error || e?.message || '';
      let msg = '语音识别出现错误';
      switch (code) {
        case 'no-speech': msg = '未检测到语音，请靠近麦克风再试'; break;
        case 'audio-capture': msg = '未检测到麦克风，请检查设备连接或权限'; break;
        case 'not-allowed': msg = '浏览器未授权麦克风访问，请在地址栏允许麦克风权限'; break;
        case 'aborted': msg = '语音识别已中止，请重新开始'; break;
        case 'network': msg = '网络错误，稍后重试或检查网络连接'; break;
        case 'service-not-allowed': msg = '语音服务不可用或被禁用'; break;
        case 'bad-grammar': msg = '语法配置错误'; break;
        case 'language-not-supported': msg = '当前语言不受支持'; break;
        default: msg = code ? String(code) : '未知错误'; break;
      }
      setError(msg);
      setListening(false);
    };
    recognition.onspeechend = () => {
      if (!(isFirefox || isSafari)) {
        try { recognition.stop?.(); } catch {}
      }
    };
    recognition.onaudioend = () => {
      if (!(isFirefox || isSafari)) {
        try { recognition.stop?.(); } catch {}
      }
    };
    recognition.onsoundend = () => {
      if (!(isFirefox || isSafari)) {
        try { recognition.stop?.(); } catch {}
      }
    };
    recognition.onnomatch = () => setError('未能识别到语音内容，请再试一次');
    recognition.onend = () => {
      setListening(false);
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };

    try {
      if (isFirefox) {
        setTimeout(() => {
          try { recognition.start(); } catch (err) { handleStartError(err); }
        }, 150);
      } else {
        recognition.start();
      }
    } catch (err) {
      handleStartError(err);
      return;
    }

    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      try { recognition.stop?.(); recognition.abort?.(); } catch {}
      setListening(false);
    }, 15000) as unknown as number;

    function handleStartError(err: unknown) {
      const msg = (err as Error)?.message || String(err);
      if (isSafari || isIOS) {
        setError('Safari/iOS 需在 HTTPS/localhost 且点击按钮触发后使用语音，请重试');
      } else {
        setError(msg);
      }
      setListening(false);
    }
  };
  const stop = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop?.();
        recognition.abort?.();
      } catch {}
    }
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  return { listening, transcript, start, stop, error };
}