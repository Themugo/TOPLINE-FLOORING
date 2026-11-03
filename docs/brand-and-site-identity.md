# Brand and site identity

One brand, edited in **Admin > Site Settings**, shown everywhere at once.

| What | Where you edit it | Where it appears |
| --- | --- | --- |
| Business name | General > Business name | page titles, footer copyright, search results, header/footer accessibility labels |
| Brand name (large text), descriptor, slogan | General > Logo text and descriptor | website header, footer, admin sidebar (brand name), default hero label |
| Logo | Appearance > Header Logo | website header, footer, admin sidebar, social/search preview image, structured data |
| Show brand text next to logo | Appearance | turn off when the uploaded logo already contains the business name |
| Favicon | Appearance > Browser Favicon | browser tab icon |

All values are stored in the `site_info` row of `site_settings`. Defaults (the built-in Topline mark, "Topline", "FLOORING & WATERPROOFING", "Professional Solutions for Lasting Spaces") live in `src/lib/brand.ts` and apply whenever a field is empty. Logos uploaded under the old Logo/Favicon keys are carried over automatically the next time Site Settings is opened and saved.

Code that needs the brand uses `useBrand()` (`src/hooks/use-brand.ts`); the header and footer share `BrandLockup`. Do not hardcode the name, descriptor or logo in new components.

## What does not change automatically

These are static files that the browser or the phone reads before the app runs, so they cannot follow the editor:

- **Installed phone-app icon and name** (`public/manifest.webmanifest`, `public/icons/*`). To change them: replace `public/topline-brand-mark.svg`, edit `name` / `short_name` in the manifest, run `node scripts/generate-pwa-icons.mjs`, and deploy. People who already installed the app may need to reinstall it to see a new icon.
- **Offline page** (`public/offline.html`) uses the built-in mark.
- **Auth emails** (sign-up, password reset) use the HTML templates in `docs/email-templates`, pasted into the Supabase dashboard; update the logo and name there.
- **Transactional email sender name** is the `BREVO_SENDER_NAME` secret in Supabase.
