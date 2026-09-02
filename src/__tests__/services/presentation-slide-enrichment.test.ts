import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  Output: { object: (config: unknown) => config },
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: () => (model: string) => ({ model }),
}));

vi.mock('@/services/LessonService', () => ({
  LessonService: { getLessonById: vi.fn() },
}));

import { PresentationService } from '@/services/PresentationService';

const LESSON = {
  lessonTitle: 'Quy trình thực thi',
  lessonContent: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Quy trình gồm phân tích yêu cầu, phát triển hạ tầng và kiểm thử hệ thống.',
          },
        ],
      },
    ],
  },
  duration: '15',
};

/** RMIT-style metadata: dividers hold a title only, content slides hold more. */
const METADATA = {
  SECTION_HEADER_2: { text_slots: 1, capacity: 1 },
  CONTENT_SLIDE: { text_slots: 2, capacity: 4 },
};

function planResponse(slides: unknown[]) {
  return { output: { slides } };
}

async function generate(metadata = METADATA) {
  return (
    PresentationService as unknown as {
      generatePlan: (opts: unknown) => Promise<{
        slides: { layoutType: string; bindings: Record<string, unknown> }[];
      }>;
    }
  ).generatePlan({
    ...LESSON,
    templateCategories: Object.keys(metadata),
    templateCategoryMetadata: metadata,
  });
}

describe('planner fills empty slides and deepens shallow ones', () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
    process.env.OPENROUTER_API_KEY = 'test-key';
  });

  it('runs a second pass for a content slide left almost empty', async () => {
    mockGenerateText
      .mockResolvedValueOnce(
        planResponse([
          {
            layoutType: 'CONTENT_SLIDE',
            slideTitle: 'Chuyên gia tư vấn chiến lược',
            bindings: { body_text: 'Chuyên gia' },
          },
        ])
      )
      .mockResolvedValueOnce(
        planResponse([
          {
            index: 0,
            bindings: {
              bullets: [
                'Phân tích yêu cầu hệ thống',
                'Phát triển hạ tầng kỹ thuật',
                'Kiểm thử toàn diện',
              ],
            },
          },
        ])
      );

    const plan = await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(plan.slides[0].bindings.bullets).toHaveLength(3);
    // The first pass's copy is preserved, not replaced.
    expect(plan.slides[0].bindings.body_text).toBe('Chuyên gia');
  });

  it('leaves title-only layouts alone, so dividers stay clean', async () => {
    mockGenerateText.mockResolvedValueOnce(
      planResponse([
        {
          layoutType: 'SECTION_HEADER_2',
          slideTitle: 'Quy trình thực thi',
          bindings: {},
        },
      ])
    );

    const plan = await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(plan.slides[0].bindings).toEqual({});
  });

  it('deepens a slide whose bullets are one-line assertions', async () => {
    // Full by character count, hollow to an audience: each bullet restates its
    // own heading and explains nothing.
    mockGenerateText
      .mockResolvedValueOnce(
        planResponse([
          {
            layoutType: 'CONTENT_SLIDE',
            slideTitle: 'Mục tiêu',
            bindings: {
              bullets: [
                'Tự động hóa quy trình',
                'Phân tích dữ liệu thời gian thực',
              ],
            },
          },
        ])
      )
      .mockResolvedValueOnce(
        planResponse([
          {
            index: 0,
            bindings: {
              bullets: [
                'Tự động hóa quy trình phân tích yêu cầu, cắt thời gian bàn giao từ hai tuần xuống ba ngày.',
                'Phân tích dữ liệu thời gian thực để phát hiện lỗi hạ tầng trước khi kiểm thử hệ thống.',
              ],
            },
          },
        ])
      );

    const plan = await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    const [bullet] = plan.slides[0].bindings.bullets as string[];
    expect(bullet.length).toBeGreaterThan(60);
  });

  it('leaves a slide alone once its items actually explain something', async () => {
    mockGenerateText.mockResolvedValueOnce(
      planResponse([
        {
          layoutType: 'CONTENT_SLIDE',
          slideTitle: 'Mục tiêu',
          bindings: {
            bullets: [
              'Tự động hóa quy trình phân tích yêu cầu, cắt thời gian bàn giao từ hai tuần xuống ba ngày.',
              'Phân tích dữ liệu thời gian thực để phát hiện lỗi hạ tầng trước khi kiểm thử hệ thống.',
            ],
          },
        },
      ])
    );

    await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('judges title+description items on the description, not the label', async () => {
    // Three-word titles are correct for a diagram layout; the descriptions are
    // where the substance has to be, so that is what decides depth.
    mockGenerateText.mockResolvedValueOnce(
      planResponse([
        {
          layoutType: 'CONTENT_SLIDE',
          slideTitle: 'Các giai đoạn',
          bindings: {
            levels: [
              {
                title: 'Phân tích',
                description:
                  'Thu thập yêu cầu từ các bên liên quan và chốt phạm vi trước khi viết dòng mã đầu tiên.',
              },
              {
                title: 'Hạ tầng',
                description:
                  'Dựng môi trường triển khai tự động để mỗi thay đổi đều được kiểm thử trên bản sao của production.',
              },
            ],
          },
        },
      ])
    );

    await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('does not try to deepen KPI figures or table cells', async () => {
    // A metric label is supposed to be terse — expanding it would wreck the
    // layout it was written for.
    mockGenerateText.mockResolvedValueOnce(
      planResponse([
        {
          layoutType: 'CONTENT_SLIDE',
          slideTitle: 'Kết quả',
          bindings: {
            metrics: [
              { value: '32%', label: 'Tăng trưởng' },
              { value: '18M', label: 'Người dùng' },
            ],
            body_text:
              'Tăng trưởng đến từ việc tự động hóa khâu kiểm thử, giúp rút ngắn chu kỳ phát hành xuống còn ba ngày.',
          },
        },
      ])
    );

    await generate();

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('treats divider-named layouts as title-only when the template reports no capacity', async () => {
    mockGenerateText.mockResolvedValueOnce(
      planResponse([
        {
          layoutType: 'SECTION_HEADER',
          slideTitle: 'Phần 2',
          bindings: {},
        },
      ])
    );

    await generate({ SECTION_HEADER: {} } as never);

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('keeps the original plan when enrichment fails', async () => {
    mockGenerateText
      .mockResolvedValueOnce(
        planResponse([
          {
            layoutType: 'CONTENT_SLIDE',
            slideTitle: 'Thin',
            bindings: { body_text: 'short' },
          },
        ])
      )
      .mockRejectedValueOnce(new Error('model unavailable'));

    const plan = await generate();

    expect(plan.slides).toHaveLength(1);
    expect(plan.slides[0].bindings.body_text).toBe('short');
  });
});
