# TOPLINE Contact + Track Order Visual Contrast Deep Audit

Date: 2026-10-15
Foundation: `TOPLINE-CONTACT-TRACK-ORDER-POLISHED-VERIFIED-2026-10-15.zip`
Scope: Contact page and Track Order page hero contrast and approved brand accent only.

## Findings

1. The global base layer in `src/index.css` assigns headings the `text-navy-950` color. On a dark navy hero, the Contact and Track Order `h1` elements did not declare their own text color, so the inherited `text-white` on the parent section did not guarantee white heading text. The screenshots show these headings rendered dark against a dark background, causing poor contrast.
2. The Contact hero guidance card's `h2` also relied on inherited color and was rendered dark against its translucent dark card.
3. Both pages used `#C8F26A` for hero highlights, which differed from the approved Signal Lime token `#B4E33D`.

## Corrections

- Explicitly set `text-white` on the Contact page hero `h1`.
- Explicitly set `text-white` on the Contact hero guidance-card `h2`.
- Explicitly set `text-white` on the Track Order hero `h1`.
- Replaced `#C8F26A` with the approved `#B4E33D` accent on these two pages.
- Extended `scripts/verify-track-contact-workflows.mjs` with four regression checks covering the headings and approved accent.
- Included `scripts/verify-premium-redesign-safety.mjs`, aligned with the existing Ocean/Lime/Petrol tokens and current semantic layout.

## Preservation boundaries

No form behavior, React state, RPC calls, order lookup privacy requirements, quotation workflow, customer settings, routes, database schema, migrations, inventory/catalogue data, or layout structure was changed.

## Verification performed in this packaging environment

- `node scripts/verify-track-contact-workflows.mjs`: 19/19 passed.
- `node scripts/verify-premium-redesign-safety.mjs`: 14/14 passed.
- `node scripts/verify-all.mjs`: 123/123 verifier scripts passed.

The source archive does not include installed `node_modules`; network access to npm/GitHub was unavailable in this packaging environment, so a fresh TypeScript/lint/test/build run was not performed here. The user’s previous local foundation had passed typecheck, lint, 194 smoke tests, and build before these narrowly scoped text-color and verifier changes. Re-run those commands locally before deployment.
