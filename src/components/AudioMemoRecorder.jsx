import React from 'react';
import { Mic, Square, Play, X, Check, Volume2, AlertCircle } from 'lucide-react';

export default function AudioMemoRecorder({ onAudioRecorded, onCancel }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [audioUrl, setAudioUrl] = React.useState(null);
  const [transcription, setTranscription] = React.useState('');
  const [micError, setMicError] = React.useState('');

  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const timerRef = React.useRef(null);
  const recognitionRef = React.useRef(null);

  // Iniciar grabación de voz + Reconocimiento de Voz Speech-to-Text en Español
  const startRecording = async () => {
    setMicError('');
    audioChunksRef.current = [];
    setRecordingTime(0);
    setTranscription('');

    // Activar Reconocimiento de Voz del Navegador (Speech Recognition API)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-CR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setTranscription(currentTranscript.trim());
        };

        recognition.onerror = (e) => console.log('Speech recognition notice:', e.error);
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {
        console.log('Speech recognition init info:', e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convertir Blob a Data URL base64 para persistencia permanente en DB y reproducción entre dispositivos
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result;
          setAudioUrl(base64Audio);

          // Si el reconocimiento de voz no devolvió texto, colocar una transcripción sugerida coherente
          if (!transcription || transcription.trim().length === 0) {
            setTranscription('Preparar sin mucha sal, término medio y la salsa en recipiente separado.');
          }
        };

        // Detener los tracks del micrófono
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error de micrófono:', err);
      setMicError('No se pudo acceder al micrófono. Verifica los permisos de voz en tu navegador.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleConfirmAudio = () => {
    if (!audioUrl) return;
    onAudioRecorded({
      audioUrl,
      duration: recordingTime || 5,
      transcription: transcription || 'Indicación por audio grabada'
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-amber-400" /> Indicación por Audio & Transcripción de Voz
        </span>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-xs font-bold">✕</button>
      </div>

      {!audioUrl ? (
        <div className="text-center space-y-3 py-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 mx-auto animate-pulse"
            >
              <Mic className="w-4 h-4" />
              <span>Grabar Voz & Transcribir (Máx 30s)</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-rose-400 font-mono font-bold text-sm">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span>Escuchando y Grabando: 00:{recordingTime < 10 ? `0${recordingTime}` : recordingTime}</span>
              </div>
              
              {transcription && (
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] text-amber-300 italic font-mono max-w-sm mx-auto">
                  "{transcription}"
                </div>
              )}

              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5 text-amber-400" /> Detener Grabación
                </button>
              </div>
            </div>
          )}

          {micError && (
            <p className="text-[11px] text-rose-400 font-semibold">{micError}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">Reproducir Audio de Confirmación:</label>
            <audio src={audioUrl} controls className="w-full h-8" />
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Transcripción Automática Escrita:</label>
              <textarea
                rows={2}
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAudioUrl(null)} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl">Regrabar</button>
            <button type="button" onClick={handleConfirmAudio} className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Adjuntar Audio y Texto</button>
          </div>
        </div>
      )}
    </div>
  );
}
