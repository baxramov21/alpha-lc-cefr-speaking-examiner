'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob, durationSeconds: number) => void;
  onRecordingStart?: () => void;
  autoStart?: boolean;
  maxSeconds?: number;
  disabled?: boolean;
  showWaveform?: boolean;
  label?: string;
}

export default function AudioRecorder({
  onRecordingComplete,
  onRecordingStart,
  autoStart = false,
  maxSeconds = 120,
  disabled = false,
  showWaveform = true,
  label,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(Array(20).fill(4));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const animateWaveform = useCallback(() => {
    if (!isRecording) return;
    setWaveformHeights(
      Array(20).fill(0).map(() => Math.random() * 28 + 4)
    );
    animationRef.current = setTimeout(animateWaveform, 100);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      animateWaveform();
    } else {
      if (animationRef.current) clearTimeout(animationRef.current);
      setWaveformHeights(Array(20).fill(4));
    }
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isRecording, animateWaveform]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      // Pick best supported codec
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      // KEY FIX: 100ms timeslice ensures audio is collected continuously
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        onRecordingComplete?.(blob, duration);
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start(100); // timeslice: collect audio every 100ms
      setIsRecording(true);
      onRecordingStart?.();

      // Auto stop after maxSeconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, maxSeconds * 1000);
    } catch {
      console.error('Microphone access denied');
    }
  }, [maxSeconds, onRecordingComplete, onRecordingStart]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData(); // flush any buffered audio
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (autoStart) startRecording();
  }, [autoStart, startRecording]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Waveform */}
      {showWaveform && (
        <div className="flex items-center gap-1 h-10">
          {waveformHeights.map((h, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-100"
              style={{
                width: 3,
                height: h,
                backgroundColor: isRecording ? '#14b8a6' : '#d1d5db',
                transitionDelay: `${i * 5}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200
          ${isRecording
            ? 'bg-teal-500 text-white pulse-ring shadow-lg shadow-teal-500/40'
            : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-600'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-7 h-7" />}
      </button>

      {label && (
        <p className="text-sm text-muted-foreground text-center">{label}</p>
      )}

      {/* Audio playback */}
      {audioUrl && !isRecording && (
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2">
          <Play className="w-4 h-4 text-teal-600" />
          <audio controls src={audioUrl} className="h-8 w-48" />
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-teal-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Recording...
        </div>
      )}
    </div>
  );
}

// Simplified mic test recorder — records a sample with timesliced audio
export function MicTestRecorder({
  onTestComplete,
}: {
  onTestComplete: (passed: boolean) => void;
}) {
  const [stage, setStage] = useState<'idle' | 'recording' | 'done'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0); // in seconds
  const [waveform, setWaveform] = useState<number[]>(Array(16).fill(4));
  const animRef = useRef<NodeJS.Timeout | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  // Waveform animation
  const startAnimate = useCallback(() => {
    const tick = () => {
      setWaveform(Array(16).fill(0).map(() => Math.random() * 24 + 4));
      animRef.current = setTimeout(tick, 120);
    };
    tick();
  }, []);

  const stopAnimate = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setWaveform(Array(16).fill(4));
  }, []);

  // Determine best supported MIME type
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mrRef.current = mr;
      chunks.current = [];

      // KEY FIX: timeslice of 100ms — collect audio data every 100ms
      // Without this, data only flushes on stop, causing cut/blurry audio
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      mr.onstop = () => {
        stopAnimate();
        // Compute duration from wall-clock time (reliable, unlike audio.duration)
        const durationSec = Math.round((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(durationSec);
        // Build blob from all collected chunks
        const finalBlob = new Blob(chunks.current, {
          type: mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(finalBlob);

        // FIX: WebM blobs don't embed duration metadata, so the <audio> element
        // shows 0:00. Seeking to a huge timestamp forces the browser to scan the
        // file and calculate the real duration before we expose the element.
        const tempAudio = new Audio();
        tempAudio.preload = 'metadata';
        tempAudio.src = url;
        tempAudio.currentTime = 1e101; // seek to "infinity"
        tempAudio.addEventListener('timeupdate', function fix() {
          if (tempAudio.duration !== Infinity && !isNaN(tempAudio.duration)) {
            tempAudio.currentTime = 0;
            tempAudio.removeEventListener('timeupdate', fix);
          }
        });

        setBlob(finalBlob);
        setAudioUrl(url);
        setStage('done');
        // Release microphone
        stream.getTracks().forEach((t) => t.stop());
      };

      startTimeRef.current = Date.now();
      mr.start(100); // 100ms timeslice — audio collected every 100ms
      setStage('recording');
      startAnimate();
    } catch (err) {
      console.error('Mic error:', err);
      alert(
        'Microphone access is required. Please allow access in your browser settings and try again.'
      );
    }
  }, [startAnimate, stopAnimate]);

  const stop = useCallback(() => {
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      // Request any remaining data before stopping
      mrRef.current.requestData();
      mrRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimate();
      if (mrRef.current?.state !== 'inactive') mrRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [stopAnimate, audioUrl]);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Waveform */}
      <div className="flex items-center gap-1 h-10">
        {waveform.map((h, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: 4,
              height: stage === 'recording' ? h : 4,
              backgroundColor: stage === 'recording' ? '#14b8a6' : stage === 'done' ? '#10b981' : '#d1d5db',
              transitionDuration: '80ms',
            }}
          />
        ))}
      </div>

      {/* Big mic button */}
      <button
        onClick={stage === 'idle' ? start : stage === 'recording' ? stop : undefined}
        disabled={stage === 'done'}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 text-white
          ${stage === 'recording'
            ? 'bg-teal-500 pulse-ring shadow-lg shadow-teal-500/40'
            : stage === 'done'
            ? 'bg-emerald-500 cursor-default'
            : 'bg-slate-300 hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/30'
          }
        `}
        aria-label={stage === 'idle' ? 'Start mic test' : stage === 'recording' ? 'Stop recording' : 'Test complete'}
      >
        {stage === 'recording' ? (
          <Square className="w-9 h-9 fill-current" />
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </button>

      <p className="text-sm text-muted-foreground text-center font-medium">
        {stage === 'idle' && 'Tap to start recording'}
        {stage === 'recording' && (
          <span className="flex items-center gap-2 text-teal-600">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording… tap to stop
          </span>
        )}
        {stage === 'done' && (
          <span className="text-emerald-600">✓ Sample recorded successfully</span>
        )}
      </p>

      {stage === 'done' && audioUrl && (
        <div className="space-y-3 w-full max-w-xs">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
            {/* Duration badge — shown immediately, from wall-clock timer */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-teal-700 font-semibold">🎙️ Play back to verify:</p>
              <span className="text-xs font-bold text-teal-700 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-full">
                {recordingDuration}s recorded
              </span>
            </div>
            <audio controls src={audioUrl} className="w-full h-9" />
          </div>
          <Button
            onClick={() => onTestComplete(true)}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-xl h-11 font-semibold"
            id="record-sample-continue-btn"
          >
            Sounds good — continue →
          </Button>
          <button
            onClick={() => {
              if (audioUrl) URL.revokeObjectURL(audioUrl);
              setAudioUrl(null);
              setBlob(null);
              setRecordingDuration(0);
              setStage('idle');
              chunks.current = [];
            }}
            className="w-full text-xs text-muted-foreground hover:text-slate-700 underline-offset-2 hover:underline transition-colors"
          >
            Not happy with it? Record again
          </button>
        </div>
      )}

    </div>
  );
}

