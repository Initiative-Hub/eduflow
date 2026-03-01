import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email và mật khẩu là bắt buộc.' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email đã được sử dụng.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: {
          connect: { name: 'USER' }, // Connect to the existing USER role
        },
      },
    })

    return NextResponse.json(
      { message: 'Đăng ký thành công.' },
      { status: 201 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}