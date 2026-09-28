import { describe, expect, it, vi } from 'vitest';
import { CourseService } from '@/services/CourseService';

const mocks = vi.hoisted(() => ({
  createOpenRouter: vi.fn(() => () => ({ model: 'test-model' })),
  generateSupplementarySearchContexts: vi.fn(),
  pdfToMarkdown: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: mocks.createOpenRouter,
}));

vi.mock('ai', () => ({
  Output: {
    object: vi.fn((config) => config),
  },
  streamText: mocks.streamText,
}));

vi.mock('@/lib/pdf', () => ({
  pdfToMarkdown: mocks.pdfToMarkdown,
}));

vi.mock('@/services/ai/course-web-search', () => ({
  generateSupplementarySearchContexts:
    mocks.generateSupplementarySearchContexts,
}));

async function readNdjson(stream: ReadableStream<string>) {
  const reader = stream.getReader();
  const events: Array<{ type: string; [key: string]: unknown }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) return events;

    for (const line of value.split('\n')) {
      if (line) events.push(JSON.parse(line));
    }
  }
}

describe('course content stream', () => {
  it('continues with partial sources after a nonfatal web search failure', async () => {
    mocks.pdfToMarkdown.mockResolvedValue('Course reference document');
    mocks.generateSupplementarySearchContexts.mockResolvedValue({
      status: 'failed',
      message: 'Web search provider unavailable',
      webContext: [
        {
          title: 'Reliable web reference',
          url: 'https://example.edu/reference',
          summary: 'Useful current context.',
          content: 'Full source content.',
        },
      ],
      youtubeContext: [],
    });
    mocks.streamText.mockReturnValue({
      textStream: (async function* () {
        yield '{"courseTitle":"Generated content"}';
      })(),
      output: Promise.resolve({
        courseTitle: 'Generated content',
        modules: [],
      }),
    });

    const { readable, writable } = new TransformStream<string, string>();
    const readPromise = readNdjson(readable);
    const writer = writable.getWriter();
    const file = {
      arrayBuffer: vi
        .fn()
        .mockResolvedValue(new TextEncoder().encode('pdf').buffer),
      name: 'reference.pdf',
      type: 'application/pdf',
    } as unknown as File;

    await CourseService.streamCourseContentToWriter(
      {
        userId: 'user-1',
        context: 'Assessment strategies',
        apiKey: 'test-api-key',
        file,
      },
      writer
    );
    await writer.close();

    const events = await readPromise;

    expect(events.map((event) => event.type)).toEqual([
      'extract',
      'search',
      'search-failed',
      'generate',
      'done',
    ]);
    expect(mocks.streamText.mock.calls[0][0].prompt).toContain(
      'Reliable web reference'
    );
    expect(file.arrayBuffer).toHaveBeenCalledOnce();
  });
});
