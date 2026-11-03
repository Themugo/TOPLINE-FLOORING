import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'wouter';
import { isExternalHref } from '@/lib/nav-active';

interface NavAnchorProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  newTab?: boolean;
  children: ReactNode;
}

/**
 * A menu link that does the right thing for whatever the editor entered: in-app paths navigate without a reload,
 * while external addresses, phone/email links and "open in a new tab" items use a normal safe anchor.
 */
export function NavAnchor({ href, newTab, children, ...rest }: NavAnchorProps) {
  if (newTab || isExternalHref(href)) {
    const external = isExternalHref(href);
    return (
      <a href={href} {...(newTab ? { target: '_blank' } : {})} rel={newTab || external ? 'noopener noreferrer' : undefined} {...rest}>
        {children}
        {newTab && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  }
  return <Link href={href} {...rest}>{children}</Link>;
}
