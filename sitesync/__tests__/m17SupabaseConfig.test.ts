import { createM17SupabaseClient, M17_SUPABASE_URL } from '../src/supabase/m17SupabaseClient';

describe('M1.7 isolated Supabase client composition', () => {
  it('creates a client for the isolated test project using the publishable key only', () => {
    const client = createM17SupabaseClient();

    expect(M17_SUPABASE_URL).toBe('https://fuaiodkyaqfandbenuol.supabase.co');
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
