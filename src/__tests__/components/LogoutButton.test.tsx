/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoutButton from '@/components/client/LogoutButton';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock @/lib/auth-client
vi.mock('@/lib/auth-client', () => ({
  signOut: vi.fn(),
}));

describe('LogoutButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: vi.fn(),
    });
  });

  it('renders correctly with the Vietnamese label', () => {
    render(<LogoutButton />);
    expect(
      screen.getByRole('button', { name: /đăng xuất/i })
    ).toBeInTheDocument();
  });

  it('calls signOut when clicked', async () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button', { name: /đăng xuất/i });

    fireEvent.click(button);

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('applies the correct styling classes', () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full', 'px-4', 'py-2');
  });
});
