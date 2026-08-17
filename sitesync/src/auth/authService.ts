import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type AuthServiceErrorCode = 'NO_SESSION' | 'AUTH_FAILED' | 'SIGN_OUT_FAILED';

export class AuthServiceError extends Error {
  readonly code: AuthServiceErrorCode;

  constructor(code: AuthServiceErrorCode, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

export class AuthService {
  constructor(private readonly client: SupabaseClient) {}

  async getCurrentSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw new AuthServiceError('AUTH_FAILED', error.message);
    return data.session;
  }

  async restoreSession(): Promise<Session> {
    const session = await this.getCurrentSession();
    if (!session) throw new AuthServiceError('NO_SESSION', 'No authenticated session');
    return session;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new AuthServiceError('AUTH_FAILED', error.message);
    if (!data.session) throw new AuthServiceError('NO_SESSION', 'Authentication returned no session');
    return data.session;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw new AuthServiceError('SIGN_OUT_FAILED', error.message);
  }
}
