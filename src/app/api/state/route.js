import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req) {
  try {
    // Get the most recent log
    const lastLog = await prisma.log.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    if (!lastLog) {
      return NextResponse.json({ state: 0, user: 'Ninguém', createdAt: null });
    }

    return NextResponse.json({
      state: lastLog.state,
      user: lastLog.user.username,
      createdAt: lastLog.createdAt,
      userId: lastLog.userId,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
