'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
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
import { Spinner } from '@/components/ui/spinner';
import { apiClient } from '@/lib/api/api-client';
import type { SavedVocabularyItem } from '@/services/english/SavedVocabularyService';
import {
  type PronunciationAssessmentResult,
  wordbankApi,
} from './wordbank.service';
import { playWordbankAudio } from './wordbank-audio';
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
  const [isGeneratingTarget, setIsGeneratingTarget] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] =
    useState<PronunciationAssessmentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tip word single-recording & scoring state
  const [activeTipWord, setActiveTipWord] = useState<string | null>(null);
  const [isRecordingTip, setIsRecordingTip] = useState(false);
  const [analyzingTipWord, setAnalyzingTipWord] = useState<string | null>(null);
  const [loadingTipWord, setLoadingTipWord] = useState<string | null>(null);
  const [tipResults, setTipResults] = useState<
    Record<string, { score: number; isCorrect: boolean }>
  >({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const tipMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tipAudioChunksRef = useRef<Blob[]>([]);

  const currentTargetSentence =
    uniqueSentences[selectedSentenceIndex] || item.word;

  const handleStartTipRecording = async (
    tipWord: string,
    targetIpa?: string
  ) => {
    setActiveTipWord(tipWord);
    tipAudioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      tipMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          tipAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(tipAudioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        setAnalyzingTipWord(tipWord);
        try {
          const result = await wordbankApi.assessPronunciation(
            audioBlob,
            tipWord,
            targetIpa
          );
          const isCorrect = result.score >= 70;
          setTipResults((prev) => ({
            ...prev,
            [tipWord]: { score: result.score, isCorrect },
          }));
        } catch {
          // Ignore tip score failure
        } finally {
          setAnalyzingTipWord(null);
          setActiveTipWord(null);
          setIsRecordingTip(false);
        }
      };

      mediaRecorder.start(100);
      setIsRecordingTip(true);
    } catch {
      setActiveTipWord(null);
      setIsRecordingTip(false);
    }
  };

  const handleStopTipRecording = () => {
    if (
      tipMediaRecorderRef.current &&
      tipMediaRecorderRef.current.state !== 'inactive'
    ) {
      tipMediaRecorderRef.current.stop();
      setIsRecordingTip(false);
    }
  };

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
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        // Send recorded audio to OpenRouter STT assessment endpoint
        handleAnalyzePronunciation(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
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
        currentTargetSentence,
        item.ipa ?? undefined
      );
      setAssessment(result);
    } catch {
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
    setIsGeneratingTarget(true);

    try {
      const blob = await apiClient.post<Blob>(
        'v1/english/tts',
        { text: currentTargetSentence },
        {
          responseType: 'blob',
          timeout: 60_000,
        }
      );
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlayingTarget(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setErrorMsg(t('audioFailed'));
        setIsGeneratingTarget(false);
        setIsPlayingTarget(false);
      };
      await audio.play();
      setIsGeneratingTarget(false);
    } catch {
      setErrorMsg(t('audioFailed'));
      setIsGeneratingTarget(false);
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
      <DialogContent className="flex max-h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-2xl border-border bg-background p-6 text-foreground shadow-xl sm:max-w-3xl sm:p-7">
        {/* Modal Header */}
        <DialogHeader className="shrink-0 gap-1.5 pb-1 text-left">
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

        <div className="my-2 flex flex-1 flex-col gap-5 overflow-y-auto pr-1.5">
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
                {isGeneratingTarget ? (
                  <Spinner className="size-4 text-primary" />
                ) : (
                  <Volume2 className="size-4 text-primary" />
                )}
                <span>
                  {isGeneratingTarget
                    ? t('loadingVoice')
                    : isPlayingTarget
                      ? 'Playing...'
                      : 'Play target'}
                </span>
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
              <span>Evaluating pronunciation...</span>
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
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-border/80 border-t pt-2 text-xs">
                  <div className="text-muted-foreground italic">
                    Recognized Speech: &ldquo;{assessment.transcript}&rdquo;
                  </div>
                  {assessment.spokenIpa && (
                    <div className="font-medium font-mono text-primary">
                      Spoken IPA: /{assessment.spokenIpa.replace(/\//g, '')}/
                    </div>
                  )}
                </div>
              )}

              {/* AI Phonetic Pronunciation Coaching Tips */}
              {(() => {
                const tips =
                  assessment.phoneticTips && assessment.phoneticTips.length > 0
                    ? assessment.phoneticTips
                    : assessment.missingWords.map((word) => ({
                        word,
                        ipa: item.ipa ?? undefined,
                        issue: `The word "${word}" was not clearly recognized in your spoken audio.`,
                        tip: `Practice articulating "${word}" slowly, focusing on clear vowel and consonant sounds.`,
                      }));

                if (tips.length === 0) return null;

                return (
                  <div className="mt-2 flex flex-col gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 font-semibold text-primary text-xs uppercase tracking-wider">
                      <Sparkles className="size-4 text-primary" />
                      <span>AI Phonetic Pronunciation Tips</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {tips.map((tip, idx) => (
                        <div
                          key={`${tip.word}-${idx}`}
                          className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/80 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-base text-primary">
                                {tip.word}
                              </span>
                              {tip.ipa && (
                                <span className="font-mono font-normal text-muted-foreground">
                                  /{tip.ipa.replace(/\//g, '')}/
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={loadingTipWord !== null}
                                onClick={() => {
                                  setLoadingTipWord(tip.word);
                                  void playWordbankAudio(tip.word, () => {
                                    setLoadingTipWord(null);
                                  }).catch(() => {
                                    setLoadingTipWord(null);
                                    setErrorMsg(t('audioFailed'));
                                  });
                                }}
                                className="h-7 gap-1.5 rounded-lg border border-primary/20 px-2.5 font-medium text-primary text-xs hover:bg-primary/10"
                                title={`Listen to "${tip.word}"`}
                              >
                                {loadingTipWord === tip.word ? (
                                  <>
                                    <Spinner className="size-3.5 text-primary" />
                                    <span>{t('loadingVoice')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="size-3.5 text-primary" />
                                    <span>{t('listen')}</span>
                                  </>
                                )}
                              </Button>

                              {isRecordingTip && activeTipWord === tip.word ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={handleStopTipRecording}
                                  className="h-7 animate-pulse gap-1.5 rounded-lg px-2.5 font-semibold text-xs shadow-sm"
                                >
                                  <MicOff className="size-3.5" />
                                  <span>Stop</span>
                                </Button>
                              ) : analyzingTipWord === tip.word ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled
                                  className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                                >
                                  <Loader2 className="size-3.5 animate-spin text-primary" />
                                  <span>Evaluating...</span>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    handleStartTipRecording(tip.word, tip.ipa)
                                  }
                                  className="h-7 gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 font-semibold text-purple-600 text-xs hover:bg-purple-500/20 dark:text-purple-300"
                                  title={`Practice pronouncing "${tip.word}"`}
                                >
                                  <Mic className="size-3.5 text-purple-500" />
                                  <span>Practice</span>
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="font-medium text-muted-foreground">
                            <span className="font-semibold text-destructive">
                              Sound Issue:
                            </span>{' '}
                            {tip.issue}
                          </p>
                          <p className="text-foreground">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Tip:
                            </span>{' '}
                            {tip.tip}
                          </p>

                          {/* Tip Practice Result Badge */}
                          {tipResults[tip.word] && (
                            <div className="mt-1 flex items-center justify-between border-border/50 border-t pt-1.5">
                              <span className="font-medium text-[11px] text-muted-foreground">
                                Practice Result:
                              </span>
                              <span
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-extrabold text-xs ${
                                  tipResults[tip.word].isCorrect
                                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'border border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                <CheckCircle2 className="size-3.5" />
                                {tipResults[tip.word].score}%{' '}
                                {tipResults[tip.word].isCorrect
                                  ? 'Passed!'
                                  : 'Try Again'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Clean Footer */}
        <DialogFooter className="mt-1 flex shrink-0 justify-end border-border/50 border-t pt-3">
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
