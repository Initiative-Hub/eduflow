import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import enMessages from '../../../messages/en.json';

const mockToastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
}));

vi.mock(
  '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/use-lesson',
  () => ({
    useImportSlideTemplate: () => ({ mutate: vi.fn(), isPending: false }),
    useSlideTemplatePreviews: () => ({ data: [], isLoading: false }),
  })
);

import { TemplateManagerDialog } from '@/app/[locale]/(dashboard)/courses/[courseId]/lessons/[lessonId]/_components/template-manager-dialog';

const MAX_MB = 150;

function renderDialog() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <TemplateManagerDialog
        isOpen
        onOpenChange={vi.fn()}
        selectedCollection="starter"
        onSelectCollection={vi.fn()}
        collections={[]}
      />
    </NextIntlClientProvider>
  );
}

function makePptx(sizeMb: number) {
  const file = new File(['x'], 'brand.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  Object.defineProperty(file, 'size', { value: sizeMb * 1024 * 1024 });
  return file;
}

describe('template upload size limit', () => {
  it('advertises the 150 MB limit', () => {
    renderDialog();
    expect(
      screen.getByText(`PPTX, ZIP or SVG file (up to ${MAX_MB} MB)`)
    ).toBeInTheDocument();
  });

  it('rejects a file over the limit with a readable message', async () => {
    mockToastError.mockClear();
    renderDialog();
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await userEvent.upload(input, makePptx(160));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'This file is 160.0 MB, which exceeds the 150 MB upload limit. Please upload a smaller template.'
      );
    });
  });

  it('accepts a file at 149 MB, under the new limit', async () => {
    mockToastError.mockClear();
    renderDialog();
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    await userEvent.upload(input, makePptx(149));

    await waitFor(() => {
      expect(screen.getByText('brand.pptx')).toBeInTheDocument();
    });
    expect(mockToastError).not.toHaveBeenCalled();
  });
});
