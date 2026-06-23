import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Faltam dados' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
