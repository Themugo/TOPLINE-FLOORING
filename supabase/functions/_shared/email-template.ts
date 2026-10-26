// Branded transactional email rendering. Pure functions: no Deno APIs, so the same file runs in the worker and in unit tests.
export type EmailBrand = { name: string; siteUrl: string; supportEmail?: string | null };

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Plain text to HTML paragraphs. Everything is escaped first. Only URLs on the brand's own domain become links, so a
 * buyer cannot get a third-party link made clickable in an email that carries the TOPLINE name.
 */
export function textToEmailHtml(text: string, siteUrl: string): string {
  const escaped = escapeHtml(text.replace(/\r\n?/g, "\n"));
  const base = escapeRegExp(escapeHtml(siteUrl.replace(/\/+$/, "")));
  const linked = escaped.replace(new RegExp(`${base}(?:/[^\\s<&]*)?`, "g"), (url) => {
    const trailing = url.match(/[.,;:!?)]+$/)?.[0] ?? "";
    const core = trailing ? url.slice(0, url.length - trailing.length) : url;
    return `<a href="${core}" style="color:#0b5ed7;text-decoration:underline;">${core}</a>${trailing}`;
  });
  return linked
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px 0;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderTransactionalEmail(input: { subject: string; message: string; brand: EmailBrand }) {
  const { subject, message, brand } = input;
  const siteUrl = brand.siteUrl.replace(/\/+$/, "");
  const host = siteUrl.replace(/^https?:\/\//, "");
  const support = brand.supportEmail ? ` Questions? Reply to this email or write to ${escapeHtml(brand.supportEmail)}.` : " Questions? Simply reply to this email.";
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:#0f2a43;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:bold;">${escapeHtml(brand.name)}</td></tr>
<tr><td style="padding:28px;color:#1f2933;font-size:15px;line-height:1.6;">${textToEmailHtml(message, siteUrl)}</td></tr>
<tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;line-height:1.5;">${escapeHtml(brand.name)} &middot; <a href="${escapeHtml(siteUrl)}" style="color:#6b7280;">${escapeHtml(host)}</a><br />You are receiving this email because of a request or account activity on our website.${support}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${message}\n\n--\n${brand.name}\n${siteUrl}`;
  return { subject, text, html };
}
