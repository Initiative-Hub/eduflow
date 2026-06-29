import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { withPermissions } from '@/lib/api/middlewares';
import { PLATFORM_PERMISSION } from '@/lib/permissions/permission-keys';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List users (admin only)
 *     security:
 *       - SessionCookie: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const GET = withPermissions(
  [PLATFORM_PERMISSION.USERS_VIEW],
  async (_req, _sessionData) => {
    try {
      const users = await prisma.user.findMany({
        include: { role: true },
      });

      const out = users.map((u) => ({
        id: u.id,
        email: u.email,
        emailVerified: u.emailVerified,
        name: u.name,
        role: u.role?.name,
        createdAt: u.createdAt,
      }));
      return NextResponse.json(out);
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }
);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Create a user (admin only)
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 */
export const POST = withPermissions(
  [PLATFORM_PERMISSION.USERS_CREATE],
  async (req, _sessionData) => {
    try {
      const { email, name, password, role } = await req.json();
      if (!email || !password) {
        return NextResponse.json(
          { message: 'Email and password required' },
          { status: 400 }
        );
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        );
      }

      const hashed = await bcrypt.hash(password, 10);
      const data: any = { email, name, password: hashed };
      if (role) data.role = { connect: { name: role } };

      const created = await prisma.user.create({ data });
      return NextResponse.json(
        { message: 'Created', id: created.id },
        { status: 201 }
      );
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }
);

/**
 * @swagger
 * /api/admin/users:
 *   put:
 *     tags:
 *       - Admin
 *     summary: Update a user (admin only)
 *     security:
 *       - SessionCookie: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated user
 *       400:
 *         description: Missing id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export const PUT = withPermissions(
  [PLATFORM_PERMISSION.USERS_UPDATE],
  async (req, _sessionData) => {
    try {
      const { id, name, email, role } = await req.json();
      if (!id) {
        return NextResponse.json({ message: 'Missing id' }, { status: 400 });
      }

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (role !== undefined) data.role = { connect: { name: role } };

      const updated = await prisma.user.update({ where: { id }, data });
      return NextResponse.json({ message: 'Updated', id: updated.id });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
  }
);
