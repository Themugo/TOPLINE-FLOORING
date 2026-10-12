// A chainable stand-in for the Supabase client. Every query resolves to a result chosen by the test.
export interface StubResult { data: unknown; error: { message: string; code?: string } | null; count?: number | null }

export interface CallContext {
  kind: 'from' | 'rpc' | 'storage';
  name: string;
  /** Method calls made on the chain, in order, e.g. insert({..}), eq('id', 1), select('id'). */
  ops: { method: string; args: unknown[] }[];
}

export interface StubOptions {
  /** Override the result of a specific RPC (e.g. the staff profile/permissions the admin guard needs). */
  rpcResult?: (name: string) => StubResult | undefined;
  /** Decide the result of any query from what was actually called. Return undefined to use the default. */
  respond?: (ctx: CallContext) => StubResult | undefined;
  /** Every completed call is reported here so a test can assert on the payload that was sent. */
  onCall?: (ctx: CallContext) => void;
  /** Signed-in user returned by auth.getUser(); null means signed out. */
  user?: { id: string; email: string } | null;
}

// Real Supabase returns a single row (or null) for .single()/.maybeSingle() and for scalar RPCs, an array only for
// multi-row queries. The stub mirrors that so a page is not fed a shape the real client could never produce.
function makeChain(getResult: () => StubResult, options: StubOptions, ctx: CallContext, single: boolean): unknown {
  const chain: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') {
        return (resolve: (v: StubResult) => unknown) => {
          options.onCall?.(ctx);
          const r = options.respond?.(ctx) ?? getResult();
          const isSingle = single || ctx.ops.some((o) => o.method === 'single' || o.method === 'maybeSingle');
          return Promise.resolve(isSingle && Array.isArray(r.data) ? { ...r, data: null } : r).then(resolve);
        };
      }
      return (...args: unknown[]) => {
        ctx.ops.push({ method: String(prop), args });
        return chain;
      };
    },
    apply: () => chain,
  });
  return chain;
}

export function makeStub(getResult: () => StubResult, options: StubOptions = {}) {
  const client = {
    from: (name: string) => makeChain(getResult, options, { kind: 'from', name, ops: [] }, false),
    rpc: (name: string, args?: unknown) => {
      // An explicit override is returned as-is (it may legitimately be an array); otherwise behave like a scalar RPC.
      const explicit = options.rpcResult?.(name);
      const ctx: CallContext = { kind: 'rpc', name, ops: [{ method: 'rpc', args: [args] }] };
      return makeChain(() => explicit ?? getResult(), options, ctx, !explicit);
    },
    functions: { invoke: async () => getResult() },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: unknown) => {
          const ctx: CallContext = { kind: 'storage', name: bucket, ops: [{ method: 'upload', args: [path, file] }] };
          options.onCall?.(ctx);
          return options.respond?.(ctx) ?? getResult();
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://stub.invalid/${bucket}/${path}` } }),
        createSignedUrl: async () => getResult(),
        remove: async () => getResult(),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: options.user ? { user: options.user, access_token: 'stub' } : null }, error: null }),
      getUser: async () => ({ data: { user: options.user ?? null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: null, error: { message: 'stub' } }),
      signOut: async () => ({ error: null }),
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
  return client;
}
