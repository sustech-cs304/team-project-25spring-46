import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({ select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) })
  }))
}));


import supabase, { testSupabaseConnection } from '../../src/supabaseClient';

describe('supabaseClient', () => {
  it('should initialize client with URL and key', () => {
    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    );
  });

  it('testSupabaseConnection calls supabase.from', async () => {
    const fromSpy = supabase.from as jest.Mock;
    await testSupabaseConnection();
    expect(fromSpy).toHaveBeenCalledWith('users');
  });
});