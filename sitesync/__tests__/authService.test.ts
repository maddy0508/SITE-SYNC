import { AuthService } from '../src/auth/authService';

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: 2000000000,
  token_type: 'bearer',
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as never;

function clientWith(overrides: Record<string, unknown>) {
  return {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(async () => ({ data: { session }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      ...overrides,
    },
  };
}

describe('AuthService', () => {
  it('restores an existing session', async () => {
    const client = clientWith({ getSession: jest.fn(async () => ({ data: { session }, error: null })) });

    await expect(new AuthService(client as never).restoreSession()).resolves.toBe(session);
  });

  it('rejects when there is no session', async () => {
    const client = clientWith({ getSession: jest.fn(async () => ({ data: { session: null }, error: null })) });

    await expect(new AuthService(client as never).restoreSession()).rejects.toMatchObject({ code: 'NO_SESSION' });
  });

  it('signs in with password and requires a returned session', async () => {
    const client = clientWith({
      signInWithPassword: jest.fn(async () => ({ data: { session }, error: null })),
    });

    await expect(new AuthService(client as never).signIn('worker@example.com', 'password')).resolves.toBe(session);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'worker@example.com',
      password: 'password',
    });
  });

  it('maps auth failures to a typed error', async () => {
    const client = clientWith({
      signInWithPassword: jest.fn(async () => ({ data: { session: null }, error: { message: 'Invalid login credentials' } })),
    });

    await expect(new AuthService(client as never).signIn('worker@example.com', 'wrong')).rejects.toMatchObject({
      code: 'AUTH_FAILED',
      message: 'Invalid login credentials',
    });
  });

  it('signs out through Supabase', async () => {
    const client = clientWith({ signOut: jest.fn(async () => ({ error: null })) });

    await new AuthService(client as never).signOut();
    expect(client.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
