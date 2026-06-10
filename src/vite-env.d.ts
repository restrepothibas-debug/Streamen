interface ImportMeta {
  readonly env: {
    readonly [key: string]: string | undefined;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
  };
}
