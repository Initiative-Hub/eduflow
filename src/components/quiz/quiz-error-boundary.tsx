'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface QuizErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface QuizErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches rendering errors in quiz components.
 * Displays a user-friendly error state with a retry button.
 */
export class QuizErrorBoundary extends Component<
  QuizErrorBoundaryProps,
  QuizErrorBoundaryState
> {
  constructor(props: QuizErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): QuizErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('QuizErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/50 p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-lg">
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {this.props.fallbackMessage ??
                'An unexpected error occurred while rendering the quiz. Please try again.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
