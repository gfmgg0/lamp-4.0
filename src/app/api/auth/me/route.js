import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
