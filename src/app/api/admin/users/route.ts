import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    })
    if (!me || me.role?.name !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: { role: true },
    })
    const out = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role?.name,
    }))
    return NextResponse.json(out)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    })
    if (!me || me.role?.name !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id, name, email, role } = await req.json()
    if (!id) {
      return NextResponse.json({ message: 'Missing id' }, { status: 400 })
    }

    const data: any = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (role !== undefined) data.role = { connect: { name: role } }

    const updated = await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ message: 'Updated', id: updated.id })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    })
    if (!me || me.role?.name !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { email, name, password, role } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ message: 'Email already exists' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const data: any = { email, name, password: hashed }
    if (role) data.role = { connect: { name: role } }

    const created = await prisma.user.create({ data })
    return NextResponse.json({ message: 'Created', id: created.id }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
