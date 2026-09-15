import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useSeoMeta } from '@/hooks/use-seo';
import { loadPublishedPage, SitePage, SitePageBlock } from '@/lib/site-control';

function css(style: Record<string, unknown>): React.CSSProperties {
  return {
    textAlign: style.align as React.CSSProperties['textAlign'],
    backgroundColor: style.background as string,
    color: style.color as string,
    padding: style.padding as string,
    borderRadius: style.radius as string,
    maxWidth: style.maxWidth as string,
    margin: style.margin as string,
  };
}

function linkOrText(text: string, href?: string) {
  return href ? (
    <Link href={href} className="btn-primary inline-flex">
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  );
}

function Block({ block }: { block: SitePageBlock }) {
  const c = block.content;

  switch (block.block_type) {
    case 'hero':
      return (
        <section
          style={css(block.style)}
          className="rounded-2xl overflow-hidden p-8 md:p-14"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {c.image_url && (
              <img
                src={String(c.image_url)}
                alt={String(c.alt || '')}
                className="w-full aspect-video object-cover rounded-xl order-2"
              />
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">
                {String(c.heading || block.title || '')}
              </h1>
              <p className="mt-4 text-lg opacity-80">
                {String(c.subheading || '')}
              </p>
              <p className="mt-3 opacity-80">
                {String(c.description || '')}
              </p>
              {c.button_text && (
                <div className="mt-6">
                  {linkOrText(
                    String(c.button_text),
                    c.button_link ? String(c.button_link) : undefined,
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      );

    case 'rich_text':
      return (
        <section style={css(block.style)} className="prose max-w-none py-8">
          <h2>{String(c.heading || block.title || '')}</h2>
          <p className="whitespace-pre-line">{String(c.body || '')}</p>
        </section>
      );

    case 'image':
      return (
        <figure style={css(block.style)} className="py-6">
          <img
            src={String(c.image_url || '')}
            alt={String(c.alt || '')}
            className="w-full max-h-[650px] object-cover rounded-xl"
          />
          {c.caption && (
            <figcaption className="text-sm text-gray-500 mt-2">
              {String(c.caption)}
            </figcaption>
          )}
        </figure>
      );

    case 'two_column':
      return (
        <section
          style={css(block.style)}
          className="grid md:grid-cols-2 gap-8 py-8"
        >
          <div>
            {c.left_image && (
              <img
                src={String(c.left_image)}
                alt=""
                className="rounded-xl mb-4 w-full"
              />
            )}
            <h2 className="text-2xl font-bold">
              {String(c.left_heading || '')}
            </h2>
            <p className="whitespace-pre-line mt-2">
              {String(c.left_body || '')}
            </p>
          </div>
          <div>
            {c.right_image && (
              <img
                src={String(c.right_image)}
                alt=""
                className="rounded-xl mb-4 w-full"
              />
            )}
            <h2 className="text-2xl font-bold">
              {String(c.right_heading || '')}
            </h2>
            <p className="whitespace-pre-line mt-2">
              {String(c.right_body || '')}
            </p>
          </div>
        </section>
      );

    case 'cards':
    case 'feature_grid': {
      const items = Array.isArray(c.items)
        ? (c.items as Array<Record<string, unknown>>)
        : [];

      return (
        <section style={css(block.style)} className="py-8">
          <h2 className="text-3xl font-bold mb-6">
            {String(c.heading || block.title || '')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((x, i) => (
              <article key={i} className="border rounded-xl p-5 bg-white">
                {x.image_url && (
                  <img
                    src={String(x.image_url)}
                    alt=""
                    className="rounded-lg w-full aspect-video object-cover mb-4"
                  />
                )}
                <h3 className="font-semibold text-lg">
                  {String(x.title || '')}
                </h3>
                <p className="text-gray-600 mt-2 whitespace-pre-line">
                  {String(x.text || '')}
                </p>
              </article>
            ))}
          </div>
        </section>
      );
    }

    case 'cta':
      return (
        <section
          style={css(block.style)}
          className="py-10 px-8 rounded-2xl"
        >
          <h2 className="text-3xl font-bold">
            {String(c.heading || block.title || '')}
          </h2>
          <p className="mt-3 whitespace-pre-line">
            {String(c.body || '')}
          </p>
          {c.button_text && (
            <div className="mt-5">
              {linkOrText(
                String(c.button_text),
                c.button_link ? String(c.button_link) : undefined,
              )}
            </div>
          )}
        </section>
      );

    case 'quote':
      return (
        <blockquote
          style={css(block.style)}
          className="border-l-4 pl-6 py-6 italic text-xl"
        >
          “{String(c.quote || '')}”
          <footer className="text-sm not-italic mt-2">
            {String(c.author || '')}
          </footer>
        </blockquote>
      );

    case 'divider':
      return <hr className="my-8" />;

    case 'spacer':
      return <div style={{ height: Number(c.height) || 64 }} />;

    default:
      return null;
  }
}

export default function CustomPage() {
  const [location] = useLocation();
  const slug = useMemo(
    () =>
      location
        .replace(/^\/page\//, '')
        .split('?')[0]
        .replace(/\/$/, ''),
    [location],
  );
  const [data, setData] = useState<{
    page: SitePage;
    blocks: SitePageBlock[];
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    void loadPublishedPage(slug)
      .then(setData)
      .catch(() => setError(true));
  }, [slug]);

  useSeoMeta(data?.page?.slug || 'home');

  if (error || (!data && slug)) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          Page not found.
        </div>
      </CustomerLayout>
    );
  }

  if (!data) {
    return (
      <CustomerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          Loading...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div
        className={
          data.page.template === 'full_width'
            ? 'w-full'
            : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        }
      >
        <header className="py-10">
          <h1 className="text-4xl font-bold">{data.page.title}</h1>
        </header>
        {data.blocks.map((b) => (
          <Block key={b.id} block={b} />
        ))}
      </div>
    </CustomerLayout>
  );
}
