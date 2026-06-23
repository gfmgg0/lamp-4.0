import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = 'my-super-secret-lamp-key-for-jwt';
const key = new TextEncoder().encode(secretKey);

export async function signJWT(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key);
}

export async function verifyJWT(token) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  
  return await verifyJWT(token);
}
