import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoutButton from '@/components/client/LogoutButton';
import { signOut } from 'next-auth/react';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}));

describe('LogoutButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with the Vietnamese label', () => {
    render(<LogoutButton />);
    expect(
      screen.getByRole('button', { name: /đăng xuất/i })
    ).toBeInTheDocument();
  });

  it('calls signOut with correct parameters when clicked', () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button', { name: /đăng xuất/i });

    fireEvent.click(button);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('applies the correct styling classes', () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full', 'px-4', 'py-2');
  });
});
