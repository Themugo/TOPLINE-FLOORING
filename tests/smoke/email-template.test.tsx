import { describe, expect, it } from 'vitest';
import { escapeHtml, renderTransactionalEmail, textToEmailHtml } from '../../supabase/functions/_shared/email-template';

const SITE = 'https://toplinefloorandwaterproofing.co.ke';
const brand = { name: 'Topline Flooring & Waterproofing', siteUrl: SITE, supportEmail: 'support@toplinefloorandwaterproofing.co.ke' };

describe('transactional email template', () => {
  it('escapes markup, quotes and ampersands', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;');
    const html = textToEmailHtml('Hello <b>Amina</b> & team', SITE);
    expect(html).toContain('&lt;b&gt;Amina&lt;/b&gt; &amp; team');
    expect(html).not.toContain('<b>');
  });

  it('turns only links to our own site into anchors', () => {
    const html = textToEmailHtml(`Sign in: ${SITE}/portal\nTrack: http://evil.example/phish and https://other.example/x`, SITE);
    expect(html).toContain(`<a href="${SITE}/portal"`);
    expect(html).not.toContain('href="http://evil.example');
    expect(html).not.toContain('href="https://other.example');
    expect(html).toContain('http://evil.example/phish');
  });

  it('keeps trailing punctuation outside the link', () => {
    const html = textToEmailHtml(`Open ${SITE}/quotation.`, SITE);
    expect(html).toContain(`<a href="${SITE}/quotation" style="color:#0b5ed7;text-decoration:underline;">${SITE}/quotation</a>.`);
  });

  it('cannot be broken out of an href with quotes', () => {
    const html = textToEmailHtml(`${SITE}/x"onmouseover="alert(1)`, SITE);
    expect(html).not.toMatch(/href="[^"]*"onmouseover/);
    expect(html).not.toContain('"onmouseover=');
  });

  it('renders paragraphs, a branded header and a footer, and a plain-text alternative', () => {
    const out = renderTransactionalEmail({ subject: 'We received your message (MSG-12345678)', message: 'Hello Amina,\n\nThanks for writing.\nSecond line.', brand });
    expect(out.html).toContain('Topline Flooring &amp; Waterproofing');
    expect(out.html).toContain('<p style="margin:0 0 16px 0;">Hello Amina,</p>');
    expect(out.html).toContain('Thanks for writing.<br />Second line.');
    expect(out.html).toContain('support@toplinefloorandwaterproofing.co.ke');
    expect(out.html).toContain('<title>We received your message (MSG-12345678)</title>');
    expect(out.text.startsWith('Hello Amina,\n\nThanks for writing.')).toBe(true);
    expect(out.text.endsWith(`--\nTopline Flooring & Waterproofing\n${SITE}`)).toBe(true);
    expect(out.html).toContain('width="600"');
  });

  it('escapes a hostile subject in the document title', () => {
    const out = renderTransactionalEmail({ subject: '</title><script>1</script>', message: 'x', brand });
    expect(out.html).not.toContain('<script>1</script>');
  });
});
