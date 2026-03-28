import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/register/route';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('POST /api/register', () => {
  it('returns 400 if email or password is missing', async () => {
    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }), // Missing password
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Email and password are required.');
  });

  it('returns 400 if user already exists', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: '1',
      email: 'exist@test.com',
    });

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'exist@test.com',
        password: 'password123',
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Email is already in use.');
  });

  it('creates a user and returns 201 on success', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed_password');
    (prisma.user.create as any).mockResolvedValue({ id: '2' });

    const req = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'new@test.com', password: 'password123' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe('Registration successful.');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@test.com',
        password: 'hashed_password',
      }),
    });
  });
});
