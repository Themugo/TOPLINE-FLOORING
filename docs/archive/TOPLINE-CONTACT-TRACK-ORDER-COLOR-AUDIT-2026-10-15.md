# TOPLINE — Contact & Track Order colour audit and polish spec

Date: 2026-10-15
Build audited: `TOPLINE-FULL-PROJECT-DESIGN-SYSTEM-2026-10-15.zip` (Ocean navy #0C2D57, Signal lime #B4E33D, Petrol #0E6B78, warm concrete neutrals)
Scope: `src/pages/contact.tsx` and `src/pages/track-order.tsx` only. **No code was changed.** Every item below is a replacement for you or Claude Code to apply.
Layouts, data loading, routes and backend are untouched by this spec.

## 1. Verdict

Both pages already follow the new system in structure: navy hero, concrete page background, white cards, navy buttons, lime accents on dark. What is left is a thin layer of leftovers from older palettes, plus one invented grey that stands in for "interaction colour". Together they make the two pages feel slightly different from Services and My Account.

Nothing is broken. There are 6 colour issues, 3 accessibility misses and 2 content duplications.

## 2. Colour issues (ranked)

### C1. One stray warm gold survives in both heroes
Both hero eyebrow pills use `text-[#E4D8BF]`, a champagne from the old palette. It is the only warm tone on screens that are otherwise navy, lime and concrete.

| File | Line | Now | Replace with |
|---|---|---|---|
| contact.tsx | 77 | `text-[#E4D8BF]` | `text-[#C8F26A]` |
| track-order.tsx | 115 | `text-[#E4D8BF]` | `text-[#C8F26A]` |

Lime on navy is 10.7:1. The rest of each hero already uses `#C8F26A` for its icons, so the pill now matches.

Note for later: `services.tsx` line 87 still uses `#E7D9B9` and `#D6C7A4` for the same pill, and `service-detail.tsx` has similar leftovers. Fix them in the same pass so all three heroes match.

### C2. `#5F6B7A` is acting as the interaction colour, and it is the wrong one
The system says links and focus are petrol (`--topline-focus: #0E6B78`). These pages use a neutral grey-blue instead, in 18 places.

| Use | Where | Now | Replace with |
|---|---|---|---|
| Input focus border | all inputs, select, textarea (contact 101–108); Input (track 151, 155) | `focus:border-[#5F6B7A] focus:ring-[#5F6B7A]/15`; `focus-visible:ring-[#5F6B7A]` | `focus:border-[#0E6B78] focus:ring-[#0E6B78]/20` |
| Link hover | track 139, 140 | `hover:text-[#5F6B7A]` | `hover:text-[#0B5864]` |
| Progress "complete" bar | track 181 | `bg-[#5F6B7A]` | `bg-[#0E6B78]` |
| Decorative icons | contact 98 (MessageSquare), 110 (ShieldCheck); track 135 (ShieldCheck) | `text-[#5F6B7A]` | `text-[#0E6B78]` |

Why it matters:
- The hover on those two Track links fades navy to grey, so it reads as "disabled". Petrol-600 on white is 8.1:1.
- A completed stage drawn in mid-grey looks the same as a pending one. Petrol is 6.2:1 on white and reads as "done".

### C3. Four different icon colours on Contact
| Icon | Colour |
|---|---|
| Channel tiles (phone, mail, pin) | `#2B4C78` (a blue that is not in the palette) |
| Heading icon, privacy icon | `#5F6B7A` (grey) |
| "Visit our location" building icon | `#566F0D` (olive) |
| Hero icons | `#C8F26A` (lime, on dark only, fine) |

Rule to apply on light surfaces: **icons and text links are petrol, on a petrol-50 tile.**

| File | Line | Now | Replace with |
|---|---|---|---|
| contact.tsx | 92 tile | `bg-[#F1EFEB] text-[#2B4C78]` | `bg-[#E6F5F7] text-[#0E6B78]` |
| contact.tsx | 92 action link | `text-[#2B4C78] hover:text-[#0C2D57]` | `text-[#0E6B78] hover:text-[#0B5864]` |
| contact.tsx | 93 social links | `text-[#2B4C78]` | `text-[#0E6B78]` |
| contact.tsx | 94 icon | `text-[#566F0D]` | `text-[#0E6B78]` |
| contact.tsx | 94 directions link | `text-[#2B4C78]` | `text-[#0E6B78] hover:text-[#0B5864]` |

Petrol on petrol-50 is 5.5:1. `#2B4C78` can then be deleted from the project.

### C4. Cool blue-greys sitting inside a warm-concrete palette
The system retired cool slate in favour of warm concrete, but five cool tints remain.

| File | Line | Now | Replace with |
|---|---|---|---|
| contact.tsx | 93 social border | `#DCE2E8` | `#DDD9D2` |
| contact.tsx | 92 card hover border | `#C6D0DA` | `#CFCAC1` |
| track-order.tsx | 169 outline button border | `#C9D1DA` | `#CFCAC1` |
| track-order.tsx | 181 progress track | `#E5E9ED` | `#E3DFD8` |
| track-order.tsx | 191 row dividers | `#EEF0F2` | `#E3DFD8` |

Also `#A8B9CA` (track-order 112, hero haze): it is a grey-blue at 20% opacity and can dull the navy. Replace the gradient start with petrol `#0E6B78` so the hero picks up the accent: `from-[#0E6B78] via-[#0C2D57] to-[#0B1B2D]`. Keep `opacity-20`.

### C5. Status colours on Track Order do not match the system
| State | Now | System token | Replace with |
|---|---|---|---|
| Delivered / completed tile | `bg-emerald-50 text-emerald-700` (#047857) | success `#166534` on `#F0FDF4` | `bg-[#F0FDF4] text-[#166534]` |
| Cancelled / failed tile and banners | `red-50 / red-700 / red-800` | danger `#B91C1C` | no change needed, already matches |
| In transit / dispatched | neutral `bg-[#F1EFEB] text-[#0C2D57]`, same as "pending" | info = petrol | `bg-[#E6F5F7] text-[#0E6B78]` for dispatched, shipped and in_transit |
| Payment status (track 186) | plain navy text for every value | semantic | see below |

Payment status chip, one line each:
- paid: `bg-[#F0FDF4] text-[#166534]`
- pending / unpaid / partial: `bg-[#FFFBEB] text-[#854D0E]` (warning, amber-ochre, **not orange**)
- failed / refunded: `bg-[#FEF2F2] text-[#B91C1C]`

This is where the old orange problem could return, so use the warning token and never an orange class.

### C6. Required-field asterisks
`text-red-600` (contact 101, 102, 105, 108) → `text-red-700` (= danger `#B91C1C`). Small, but it removes the last off-token red.

## 3. Accessibility misses found while checking contrast

| # | Issue | Measured | Fix |
|---|---|---|---|
| A1 | Input and select borders `#D6D2CA` on white. UI component boundaries need 3:1. | **1.5:1** | Field border `#868D95` (3.4:1). Keep `#DDD9D2` for cards, which do not need it. |
| A2 | Placeholder, character counter, helper icons use `slate-400` `#7B8591` | 3.75:1 on white, 3.47:1 on the page background (text needs 4.5:1) | Counter (contact 108) and note text use `text-slate-500` `#5F6B78` (5.4:1). Placeholders: `placeholder:text-[#5F6B78]`. |
| A3 | Progress labels for pending stages use `text-slate-400` (track 181) | 3.75:1 | `text-slate-500` |

Passing and worth keeping: eyebrow olive `#566F0D` (5.3:1 on page, 5.7:1 on white), white 70–75% text on navy (7.5–8.3:1), lime on navy (9.2–10.7:1), navy on lime (9.2:1).

## 4. Duplications (content, not layout)

1. **Contact: the address appears twice in the left column.** The "Office and showroom" card (line 60) and the "Visit our location" card (line 94) both show the address and both offer a directions link. Suggest dropping the second card, or showing it only when the first is absent.
2. **Track Order: privacy is stated three times at desktop width.** Hero card ("Both details are required…"), left note ("Order number alone is not enough…") and form helper ("Both fields are required"). Suggest keeping the left note and the form helper and removing the hero card, or the reverse.
3. Not a bug, but note it: on phones the fixed action bar already carries the lime "Get a quote". Keep the hero button "Need a formal quotation?" **white**, as it is now. Making it lime would put two lime actions on one mobile screen and break the one-action-colour rule.

## 5. Rules these two pages should follow after the pass

- Navy `#0C2D57`: headings, primary buttons, hero.
- Lime: only on dark surfaces (icons, eyebrows, one action). On light surfaces the lime family appears only as olive eyebrow text `#566F0D`.
- Petrol `#0E6B78`: links, icons, focus, completed progress, info status.
- Neutrals: `#F7F6F3` page, `#FFFFFF` card, `#DDD9D2` card border, `#E3DFD8` divider, `#F1EFEB` soft fill. No cool greys.
- Status: success `#166534`, warning `#854D0E` on `#FFFBEB`, danger `#B91C1C`. No emerald, no orange.

## 6. Order of work (about 25 edits, all string replacements)

1. C1 and C4 (hero pill, cool greys, hero haze): safest, no behaviour change.
2. C2 and C3 (interaction colour, icon colours).
3. C5 and C6 (status chips, asterisks).
4. A1–A3 (field border, placeholder and counter).
5. Duplications (needs a content decision from you).

After editing, check each page at 375 px and 1280 px, in the empty state, the form-error state and a tracked-order result for each status (pending, in transit, delivered, cancelled).

## 7. Leftovers elsewhere (outside these two pages)

- `services.tsx` and `service-detail.tsx`: champagne pill colours (see C1).
- `index.css` line 279 `.ring-premium` still uses old gold and navy rgba values.
- `index.css` line 240 `.page-hero::after` falls back to `#8dba17`, which differs from lime `#B4E33D`.
- `Header.tsx` line 56 shadow uses the old navy rgba `(20,44,70)`.
- Reminder from your own notes: an admin-saved theme overrides the code defaults at runtime, so choose the "TOPLINE Ocean & Lime" preset in Admin → Theme and save, or the live site can still show the old values.

## 8. What was not checked

No browser was available, so this is a source and contrast-maths audit, not a visual one. Contrast figures were computed from the hex values with the WCAG 2.x formula. White-with-opacity text was computed against the solid navy behind it.
