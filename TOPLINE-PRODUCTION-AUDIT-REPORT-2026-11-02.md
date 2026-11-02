# TOPLINE production audit and completion report — 2026-11-02

## Recent work identified
Latest chain (from the supplied reports): checkout/fulfillment hardening → order payment recovery migration `20261102120000` → guest payment resume on Track Order. All prior reports stated build, typecheck, lint and DB replay were **never run** (no `node_modules`). This audit ran them for the first time.

## Defects found and fixed
1. **Add to Cart crashed on the product detail page** (`src/pages/shop-detail.tsx`): `setLocation` was called but never destructured from `useLocation()`. Typecheck failed (TS2552); Vite builds do not typecheck so the build and all 135 static verifiers still passed. Fixed.
2. **`payment-initiate` could charge a paid/refunded order** and charged the full total on part-paid orders. The reconciliation RPC would later reject the money ("exceeds outstanding balance"), leaving the customer charged with no reconciled order. Fixed: paid/refunded refused, outstanding balance charged.
3. **Double-charge window across idempotency keys.** Keys live in `sessionStorage`; a new session/device/gateway created a second live charge while the first was pending. Fixed with an in-flight guard (bank transfer excluded).
4. Track Order showed the payment-recovery panel for **refunded** orders. Fixed.
5. **Verifier blind spot:** the cart verifier only grepped for the text `setLocation('/cart')`. Added a declaration assertion (shop + product detail); confirmed it fails on the old bug.

## Verification run (this audit)
| Gate | Result |
|---|---|
| `npm run typecheck` | pass (was failing: 1 error) |
| `npm run lint` | pass |
| `npm run build` | pass |
| `npm run test:smoke` (vitest) | 222/222 pass |
| `npm run verify:all` | pass (see final run below) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Edge functions (15) | syntax-checked via esbuild (Deno not available) |
| Migration replay, clean PostgreSQL 16 + Supabase stubs | 128/128 apply (088 needs Supabase's `rls_auto_enable()` helper, which exists on real projects) |
| RLS coverage | 165/165 public tables have RLS enabled |
| SQL tests: security_regression, public_surface_regression, browser_rpc_grants, plpgsql_static_analysis | pass |
| Payment reconciliation RPC scenario test | late success recovers failed attempt + consumes stock; stale failure ignored; replay idempotent; tampered replay rejected; anon denied |
| Secret scan | no JWTs/live keys committed; no secret in any `VITE_*` |
| Vercel contract | SPA rewrite, www→apex 301, HSTS/CSP, robots, sitemap all correct; CSP compatible with built `index.html` (no inline scripts) |

## NOT verified (external gates — need your credentials/environment)
- `supabase/tests/runtime_contracts.sql` (needs `pgtap`, not installed here).
- Edge Function behaviour under Deno / deployment of the changed `payment-initiate` (**must be redeployed**: `supabase functions deploy payment-initiate`).
- Applying migrations to the production Supabase project (run `supabase migration list --linked` and `db push --dry-run --linked` first; migration `20261102120000` is additive).
- `VITE_SUPABASE_PUBLISHABLE_KEY` must be set in Vercel (blank in `.env.example` by design).
- Real M-Pesa/card sandbox UAT, Brevo domain/sender authentication and real email delivery, Supabase Auth redirect URLs, DNS/HTTPS on the canonical domain, browser/device click-through.
- Email OTP for guest payment resume is still **not** implemented (documented limitation, not a bug).

## Owner content review (not changed)
`src/lib/cms-defaults.ts` contains placeholder About/team copy ("Since 2012", "15+ years", stock-photo team). The public About page does not render it, but confirm it is not shown anywhere via the admin CMS before launch.

## Files changed
`src/pages/shop-detail.tsx`, `src/pages/track-order.tsx`, `supabase/functions/payment-initiate/index.ts`, `scripts/verify-guest-payment-resume.mjs` (12→16 checks), `scripts/verify-cart-navigation-and-brand-uniformity.mjs`, `docs/commerce/guest-payment-resume.md`, this report. No migration added.

## Deploy commands
```
npm ci && npm run typecheck && npm run lint && npm run build && npm run verify:all
supabase functions deploy payment-initiate
git add -A && git commit -m "Fix add-to-cart crash; harden payment-initiate against double/over-charge" && git push
```
