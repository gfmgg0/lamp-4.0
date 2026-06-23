import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Faltam dados' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = await signJWT({ id: user.id, username: user.username });
    
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
