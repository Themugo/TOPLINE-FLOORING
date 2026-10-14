# TOPLINE Premium End-to-End Redesign Audit — 14 October 2026

## Scope and safety boundaries

This pass starts from the supplied full project ZIP and applies a shared visual refinement before deeper page-specific changes. It does not edit Supabase migrations, catalogue rows, product/service/project identifiers, prices, image associations, RPC names, authentication logic, payment providers, order submission, or quotation submission. It does not deploy or change live settings.

**Homepage hero size is locked.** The existing hero section remains `h-[30rem] min-h-[30rem] sm:h-[32rem] lg:h-[35rem]`; its image/slide markup, image fit, overlay, and responsive sizing are unchanged. The design CSS deliberately does not set dimensions or spacing on `.topline-home-hero` or its descendants.

## Existing architecture observed

- Shared public layout: `src/components/layout/CustomerLayout.tsx`, `Header.tsx`, `Footer.tsx`.
- Theme foundation: `src/index.css`, `src/lib/theme-engine.ts`, and admin theme settings.
- Home: CMS hero slides plus existing product, service, promotion, partner, testimonial, section, theme and project hooks.
- Services: `useServices({ activeOnly: true })`; category/search are display-only filtering over the returned records; detail links retain service slugs/fallback routes.
- Portfolio: `loadPublicProjects()` reads the safe `public_projects` view and associated `project_images`; project records are not rewritten.
- Shop: `useProducts()` and `useCategories()` with existing cart hook; no catalogue mutation in the design pass.
- Cart: existing `useCart`, delivery-zone data, coupon validation, `createCustomerOrder`, and customer payment initiation.
- Contact: existing contact settings and `submitQuotationRequest` workflow.
- My Account/customer portal: existing authenticated portal loader and account data/workflow.
- Request Quotation: existing `submitQuotationRequest` and server-derived quotation reference.
- Track Order: existing public tracking flow and privacy verification contract.
- “More” is a header navigation dropdown sourced from the configured header menu (with a fallback); it is not a new route. The design keeps that contract intact.

## Design changes in this pass

1. Consolidated the governed signature palette toward deep navy `#153F69`, warm ivory `#FAF6EE`, white surfaces, and restrained champagne gold `#C9971F`.
2. Aligned the shared header's gold accents with the approved palette.
3. Added a semantic `page-shell` class to the shared content main element so shared page-level refinements can be scoped without overriding the fixed header/footer or home hero.
4. Applied consistent keyboard-focus treatment to form controls, restrained surface behavior, and mobile-safe form sizing through shared CSS.
5. Harmonized exact color literals across Home, Services, Portfolio, Shop, Cart, Contact, Portal, Quotation, Track Order and the shared Footer to reduce competing navy/gold/ivory shades. This was limited to color values; text, layout structure, dimensions, handlers, queries, and submission contracts were not changed.
6. Preserved existing page markup and business contracts in this initial safety-focused visual pass rather than replacing functional page components wholesale.

## Page-by-page audit and follow-up design intent

| Page | Current business responsibility | Design target | Must preserve |
|---|---|---|---|
| Home | CMS hero, products, services, promotions, partners, testimonials and projects | Improve shared palette consistency and action hierarchy | Exact existing hero size, CMS settings, catalogue-backed slide sources |
| Services | Active service catalogue, filters, service detail links | Calm editorial hero, aligned cards, clearer category and CTA hierarchy | Service rows, IDs, slugs and detail routing |
| Portfolio | Public project view and project images | Image-led project cards, searchable/filterable library and accessible gallery | Safe `public_projects` view and project-image relationships |
| Shop | Product/category discovery and cart actions | Readable product information, useful filters, clear stock/variant states | All product/category/variant records and add-to-cart behavior |
| More | Configured secondary navigation | Clear dropdown and mobile navigation, no invented route | CMS header-menu contract and existing URLs |
| My Account | Authentication and customer portal records | Desktop-first workspace with clear order/quote/document/support areas | Auth, customer scoping, RLS, existing portal data loaders |
| Cart | Cart, delivery, coupons, order creation, payment | Clear line items, totals, delivery and checkout status | Cart persistence, delivery/coupon validation, order RPC and payment flow |
| Request Quotation | Technical enquiry and quotation submission | Guided, readable project enquiry with clear validation | Existing submission function, accepted payload, server-generated reference |
| Contact | Contact settings and enquiry submission | Clear channels, accessible form and formal quote handoff | CMS contact data and existing submission contract |
| Track Order | Public order lookup | Clear tracking form and status presentation | Existing privacy boundary and tracking contract |

## Verification status

- Source-level design guard added: `scripts/verify-premium-redesign-safety.mjs`.
- This environment did not contain `node_modules` at inspection time; a full TypeScript build, lint, browser/device visual check, and live Supabase workflow test have not been certified in this pass. The source-level verifier passes 14/14 checks after color harmonization.
- This archive is a source-code update only. No commit, push, deployment, migration, or production data operation was performed.
