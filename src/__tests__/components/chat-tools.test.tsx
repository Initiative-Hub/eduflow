import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChatToolInvocations } from '@/app/[locale]/(dashboard)/(ai)/_components/chat-tools';

describe('chat tools', () => {
  it('renders chat tool invocation status from tool parts', () => {
    render(
      <ChatToolInvocations
        parts={[
          {
            input: {},
            output: {
              courses: [{ id: 'course-1' }, { id: 'course-2' }],
            },
            state: 'output-available',
            toolCallId: 'call-1',
            type: 'tool-getEnrolledCourses',
          },
        ]}
      />
    );

    expect(screen.getByText('Loaded 2 courses')).toBeInTheDocument();
  });
});
