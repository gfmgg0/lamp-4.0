import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromCookie } from '@/lib/auth';

export async function POST(req) {
  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { state } = await req.json();
    
    if (state !== 0 && state !== 1) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    // Check if the new state is different from the current state (to avoid spam)
    const lastLog = await prisma.log.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (lastLog && lastLog.state === state) {
      return NextResponse.json({ success: true, message: 'Mesmo estado' });
    }

    const log = await prisma.log.create({
      data: {
        state,
        userId: user.id,
      },
      include: { user: true },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
