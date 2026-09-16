import { describe, test, expect } from 'bun:test';
import { createSupabaseClient } from './supabaseClient';

describe('createSupabaseClient', () => {
  test('throws when the URL is missing', () => {
    expect(() => createSupabaseClient('', 'anon-key')).toThrow(
      'Supabase URL and anon key are required',
    );
  });

  test('throws when the anon key is missing', () => {
    expect(() => createSupabaseClient('https://x.supabase.co', '')).toThrow(
      'Supabase URL and anon key are required',
    );
  });

  test('creates a client when both values are present', () => {
    const client = createSupabaseClient('https://x.supabase.co', 'anon-key');
    expect(client).toBeDefined();
  });
});
