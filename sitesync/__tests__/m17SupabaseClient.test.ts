jest.mock('../src/supabase/m17AuthStorage', () => ({
  createM17AuthStorage: () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }),
}));

import { M17_AUTH_OPTIONS, createM17SupabaseClient } from '../src/supabase/m17SupabaseClient';

describe('M1.7 Supabase client', () => {
  test('uses persistent auth storage suitable for process-restart QA', () => {
    expect(M17_AUTH_OPTIONS.persistSession).toBe(true);
    expect(M17_AUTH_OPTIONS.autoRefreshToken).toBe(true);
    expect(M17_AUTH_OPTIONS.detectSessionInUrl).toBe(false);
  });

  test('constructs the client with the isolated target and persistent storage', () => {
    const client = createM17SupabaseClient();
    expect(client).toBeDefined();
  });
});
