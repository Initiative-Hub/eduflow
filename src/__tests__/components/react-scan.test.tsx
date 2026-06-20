import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReactScan from '@/components/react-scan';

vi.mock('next/script', () => ({
  default: ({
    src,
    crossOrigin,
    strategy,
  }: {
    src: string;
    crossOrigin?: string;
    strategy?: string;
  }) => (
    <script
      data-cross-origin={crossOrigin}
      data-strategy={strategy}
      data-testid="react-scan-script"
      src={src}
    />
  ),
}));

describe('ReactScan', () => {
  it('loads a pinned React Scan CDN script instead of the floating latest asset', () => {
    render(<ReactScan />);

    expect(screen.getByTestId('react-scan-script')).toHaveAttribute(
      'src',
      expect.stringMatching(
        /^https:\/\/unpkg\.com\/react-scan@\d+\.\d+\.\d+\/dist\/auto\.global\.js$/
      )
    );
  });
});
