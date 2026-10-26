# Supabase Auth email templates (branded, scanner-proof)

These four templates replace the default Supabase Auth emails. They link to **your site** (`/portal?token_hash=...&type=...`)
instead of straight to Supabase. The one-time token is spent only when the buyer presses the button on that page, so corporate
email security tools that merely *open* links can no longer use them up (the "link expired" problem).

## Install (Supabase dashboard, Authentication, Email Templates)

| Template | File | Suggested subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your TOPLINE account |
| Magic Link | `magic-link.html` | Your TOPLINE sign-in link |
| Reset Password | `reset-password.html` | Reset your TOPLINE password |
| Change Email Address | `change-email.html` | Confirm your new email address |

1. Paste each file into the matching template and set the subject.
2. Authentication, URL Configuration: **Site URL** must be `https://toplineflooringandwaterproofing.co.ke` (the templates use `{{ .SiteURL }}`).
3. Send yourself one of each from a test account (checklist section 5) and press the button in a normal browser.

## Safe to roll out
The portal still accepts the default Supabase links (`{{ .ConfirmationURL }}`). If a buyer's old email arrives, the page explains
an expired or used link and offers a new one. Switching templates changes nothing else.

## Notes
* Supported link types: `signup`, `magiclink`, `recovery`, `email_change`. Any other `type` is ignored by the portal.
* Do not add tracking or link-wrapping to these emails: the token must reach the page unchanged.
* The Go-template variables (`{{ .SiteURL }}`, `{{ .TokenHash }}`, `{{ .Email }}`, `{{ .NewEmail }}`) are Supabase's own; do not edit them.
