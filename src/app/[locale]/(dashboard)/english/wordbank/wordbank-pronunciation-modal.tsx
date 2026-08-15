'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import {
  type PronunciationAssessmentResult,
  wordbankApi,
} from './wordbank.service';
import type { WordbankTranslator } from './wordbank-mastery';

interface WordbankPronunciationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SavedVocabularyItem;
  t: WordbankTranslator;
}

export function WordbankPronunciationModal({
  open,
  onOpenChange,
  item,
  t,
}: WordbankPronunciationModalProps) {
  // Extract sentence choices (avoid duplicates and fallback to main word)
  const sentences = [
    item.exampleSentence &&
    !item.exampleSentence.startsWith('Example sentence for')
      ? item.exampleSentence.replace(/["“”]/g, '').split('—')[0].trim()
      : null,
    ...(item.examples ?? []).map((ex) =>
      ex.replace(/["“”]/g, '').split('—')[0].trim()
    ),
    item.word,
  ].filter((s): s is string => Boolean(s && s.trim().length > 0));

  const uniqueSentences = Array.from(new Set(sentences));

  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] =
    useState<PronunciationAssessmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTargetSentence =
    uniqueSentences[selectedSentenceIndex] || item.word;

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recordedAudioUrl]);

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setAssessment(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Release mic stream
        stream.getTracks().forEach((track) => track.stop());

        // Send recorded audio to OpenRouter Whisper STT assessment endpoint
        handleAnalyzePronunciation(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(
        'Microphone permission denied or unsupported in your browser.'
      );
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleAnalyzePronunciation = async (blob: Blob) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const result = await wordbankApi.assessPronunciation(
        blob,
        currentTargetSentence
      );
      setAssessment(result);
    } catch (err) {
      setErrorMsg(
        'Could not analyze your recording. Please speak clearly and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlayTarget = async () => {
    if (isPlayingTarget) return;
    setIsPlayingTarget(true);

    try {
      const response = await fetch('/api/v1/english/pronunciation/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentTargetSentence }),
      });

      if (!response.ok) throw new Error('Practice TTS failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlayingTarget(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        fallbackPracticeSpeech();
      };
      await audio.play();
    } catch {
      fallbackPracticeSpeech();
    }
  };

  const fallbackPracticeSpeech = () => {
    if (item.audioUrl && currentTargetSentence === item.word) {
      const audio = new Audio(item.audioUrl);
      audio.onended = () => setIsPlayingTarget(false);
      audio.onerror = () => speakBrowserUtterance();
      audio.play().catch(() => speakBrowserUtterance());
    } else {
      speakBrowserUtterance();
    }
  };

  const speakBrowserUtterance = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentTargetSentence);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingTarget(false);
      utterance.onerror = () => setIsPlayingTarget(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingTarget(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] w-full max-h-[90vh] flex flex-col rounded-2xl p-6 sm:p-7 bg-background text-foreground border-border shadow-xl overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="gap-1.5 text-left shrink-0 pb-1">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-3xl text-primary tracking-tight">
                {item.word}
              </span>
              <span className="font-mono font-normal text-muted-foreground text-sm">
                {item.ipa ?? ''}
              </span>
            </div>
            {uniqueSentences.length > 1 && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono font-semibold text-primary text-xs">
                Sentence {selectedSentenceIndex + 1} / {uniqueSentences.length}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Read the target sentence out loud to test your pronunciation
            accuracy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1.5 flex flex-col gap-5 my-2">
          {/* Main Target Card */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
            {/* Sentence Header + Navigation */}
            <div className="flex items-center justify-between">
              <span className="font-bold font-mono text-muted-foreground text-xs uppercase tracking-wider">
                READ THIS SENTENCE
              </span>
              {uniqueSentences.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={selectedSentenceIndex === 0}
                    onClick={() => {
                      setSelectedSentenceIndex((prev) => prev - 1);
                      setAssessment(null);
                      setRecordedAudioUrl(null);
                    }}
                    className="h-7 px-2.5 font-medium text-primary text-xs hover:bg-primary/10"
                  >
                    <ChevronLeft className="mr-0.5 size-3.5" /> Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={
                      selectedSentenceIndex === uniqueSentences.length - 1
                    }
                    onClick={() => {
                      setSelectedSentenceIndex((prev) => prev + 1);
                      setAssessment(null);
                      setRecordedAudioUrl(null);
                    }}
                    className="h-7 px-2.5 font-medium text-primary text-xs hover:bg-primary/10"
                  >
                    Next sentence <ChevronRight className="ml-0.5 size-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Target Sentence Box */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 font-sans font-semibold text-foreground text-xl leading-relaxed tracking-wide">
              {currentTargetSentence}
            </div>

            {/* Action Buttons: Play Target & Record */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={isPlayingTarget}
                onClick={handlePlayTarget}
                className="gap-2 rounded-xl border-border bg-background px-4 py-2.5 font-medium text-foreground shadow-2xs hover:bg-muted"
              >
                {isPlayingTarget ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <Volume2 className="size-4 text-primary" />
                )}
                <span>{isPlayingTarget ? 'Playing...' : 'Play target'}</span>
              </Button>

              {isRecording ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleStopRecording}
                  className="animate-pulse gap-2 rounded-xl px-5 py-2.5 font-semibold shadow-sm"
                >
                  <MicOff className="size-4" />
                  <span>Stop recording ({formatTime(recordingTime)})</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleStartRecording}
                  className="gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  <Mic className="size-4" />
                  <span>Start recording</span>
                </Button>
              )}
            </div>
          </div>

          {/* YOUR RECORDING Player Box */}
          {recordedAudioUrl && (
            <div className="flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-4">
              <span className="font-bold font-mono text-muted-foreground text-xs uppercase tracking-wider">
                YOUR RECORDING
              </span>
              <audio
                controls
                src={recordedAudioUrl}
                className="h-10 w-full accent-primary"
              />
            </div>
          )}

          {/* Loading Indicator */}
          {isAnalyzing && (
            <div className="flex items-center justify-center gap-2.5 py-4 font-medium text-primary text-sm">
              <Loader2 className="size-5 animate-spin" />
              <span>
                Evaluating pronunciation with OpenRouter Whisper STT...
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 font-medium text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pronunciation Assessment Result Card */}
          {assessment && !isAnalyzing && (
            <div
              className={`flex flex-col gap-3 rounded-2xl border p-5 transition-all ${
                assessment.score >= 75
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : assessment.score >= 50
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-destructive/30 bg-destructive/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`size-6 ${
                      assessment.score >= 75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : assessment.score >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-destructive'
                    }`}
                  />
                  <span
                    className={`font-extrabold text-2xl tracking-tight ${
                      assessment.score >= 75
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : assessment.score >= 50
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-destructive'
                    }`}
                  >
                    {assessment.score}% Match
                  </span>
                </div>
                <span className="font-semibold text-foreground text-sm">
                  {assessment.feedback}
                </span>
              </div>

              {/* Word-by-word Highlight Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {currentTargetSentence.split(/\s+/).map((word, idx) => {
                  const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '');
                  const isMatched = assessment.matchedWords.some(
                    (m) => m.toLowerCase().replace(/[^a-z0-9']/g, '') === clean
                  );

                  return (
                    <span
                      key={`${word}-${idx}`}
                      className={`rounded-xl px-3.5 py-1.5 font-semibold text-base transition-all ${
                        isMatched
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-800 shadow-2xs dark:text-emerald-300'
                          : 'border border-destructive/40 bg-destructive/15 text-destructive line-through opacity-85'
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>

              {assessment.transcript && (
                <div className="mt-1 border-border/80 border-t pt-2 text-muted-foreground text-xs italic">
                  Recognized Speech: &ldquo;{assessment.transcript}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clean Footer */}
        <DialogFooter className="flex justify-end shrink-0 border-t border-border/50 pt-3 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-6 font-medium"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
