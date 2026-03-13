import { cookies } from 'next/headers';

/**
 * Retrieves or generates a unique session identifier for the current user.
 * This is used to isolate graph data in the demo environment.
 */
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('attack_session_id')?.value;

  return sessionId || 'default-session';
}

/**
 * Ensures a session cookie exists. Can be called from a server component.
 */
export async function ensureSession() {
  const cookieStore = await cookies();
  if (!cookieStore.has('attack_session_id')) {
    cookieStore.set('attack_session_id', crypto.randomUUID(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }
}
