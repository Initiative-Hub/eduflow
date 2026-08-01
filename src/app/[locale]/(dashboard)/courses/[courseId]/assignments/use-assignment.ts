'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { TiptapDocument } from '@/utils/lesson-content';
import {
  type Assignment,
  assignmentService,
  type FeedbackTone,
} from './assignment.service';

export function useAssignments(courseId: string) {
  return useQuery({
    queryKey: ['assignments', courseId],
    queryFn: () => assignmentService.list(courseId),
    enabled: Boolean(courseId),
  });
}

export function useAssignment(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => assignmentService.get(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useCreateAssignment(courseId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.Assignments');

  return useMutation({
    mutationFn: (data: {
      title: string;
      content: TiptapDocument;
      dueAt: Date | null;
      maxPoints: number;
    }) => assignmentService.create(courseId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', courseId] });
      toast.success(t('created'));
    },

    onError: (error: { message?: string }) => {
      toast.error(error.message || t('saveError'));
    },
  });
}

export function useUpdateAssignment(courseId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.Assignments');

  return useMutation({
    mutationFn: (input: {
      assignmentId: string;
      title?: string;
      content?: TiptapDocument;
      dueAt?: Date | null;
      maxPoints?: number;
    }) =>
      assignmentService.update(input.assignmentId, {
        title: input.title,
        content: input.content,
        dueAt: input.dueAt,
        maxPoints: input.maxPoints,
      }),

    onSuccess: (assignment: Assignment) => {
      queryClient.setQueryData(['assignment', assignment.id], assignment);
      queryClient.invalidateQueries({
        queryKey: ['assignments', courseId],
      });
      toast.success(t('saved'));
    },

    onError: (error: { message?: string }) => {
      toast.error(error.message || t('saveError'));
    },
  });
}

export function useAssignmentSubmission(assignmentId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.AssignmentStudent');

  const upload = useMutation({
    mutationFn: (file: File) =>
      assignmentService.uploadSubmissionFile(assignmentId, file),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assignment', assignmentId],
      });
      toast.success(t('uploadSuccess'));
    },

    onError: (error: { message?: string }) => {
      toast.error(error.message || t('uploadError'));
    },
  });

  const submit = useMutation({
    mutationFn: () => assignmentService.submit(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assignment', assignmentId],
      });
      toast.success(t('submitted'));
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || t('submitError'));
    },
  });

  return {
    upload,
    submit,
  };
}

export function useAssignmentSubmissionRoster(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment-submission-roster', assignmentId],
    queryFn: () => assignmentService.listSubmissionRoster(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useGradeSubmission(assignmentId: string) {
  const queryClient = useQueryClient();
  const t = useTranslations('Courses.AssignmentTeacher');

  return useMutation({
    mutationFn: (input: {
      submissionId: string;
      score: number;
      feedback?: string;
    }) =>
      assignmentService.grade(input.submissionId, {
        score: input.score,
        feedback: input.feedback,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['assignment-submission-roster', assignmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['assignment', assignmentId],
      });
      toast.success(t('gradeSaved'));
    },

    onError: (error: { message?: string }) => {
      toast.error(error.message || t('gradeError'));
    },
  });
}

export function useRewriteAssignmentFeedback() {
  const t = useTranslations('Courses.AssignmentTeacher');

  return useMutation({
    mutationFn: (input: {
      submissionId: string;
      feedback: string;
      tone: FeedbackTone;
    }) =>
      assignmentService.rewriteFeedback(input.submissionId, {
        feedback: input.feedback,
        tone: input.tone,
      }),

    onError: (error: { message?: string }) => {
      toast.error(error.message || t('enhanceFeedbackError'));
    },
  });
}
