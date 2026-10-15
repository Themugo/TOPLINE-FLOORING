import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const checks = [];
const check = (name, condition) => {
  checks.push({ name, pass: Boolean(condition) });
};

const home = read('src/pages/home.tsx');
const css = read('src/index.css');
const layout = read('src/components/layout/CustomerLayout.tsx');
const header = read('src/components/layout/Header.tsx');
const services = read('src/pages/services.tsx');
const portfolio = read('src/pages/portfolio.tsx');
const projects = read('src/lib/public-projects.ts');
const shop = read('src/pages/shop.tsx');
const cart = read('src/pages/cart.tsx');
const contact = read('src/pages/contact.tsx');
const portal = read('src/pages/portal.tsx');
const quotation = read('src/pages/quotation.tsx');
const tracking = read('src/pages/track-order.tsx');

check(
  'Homepage hero keeps its exact existing responsive height classes',
  /topline-home-hero relative h-\[30rem\] min-h-\[30rem\] sm:h-\[32rem\] lg:h-\[35rem\]/.test(home)
);

check(
  'Hero remains CMS/catalogue driven',
  /useHeroSlides/.test(home) && /useProducts/.test(home) && /useServices/.test(home)
);

check(
  'Shared main exposes a focusable semantic page landmark with responsive spacing',
  /<main\b[^>]*id="main-content"/.test(layout) &&
    /tabIndex=\{-1\}/.test(layout) &&
    /className="[^"]*\bflex-1\b/.test(layout) &&
    /className="[^"]*\bpt-16\b/.test(layout) &&
    /className="[^"]*\bmd:pb-0\b/.test(layout) &&
    /className="[^"]*\bmd:pt-0\b/.test(layout)
);

check(
  'Premium CSS does not assign hero dimensions',
  !/\.topline-home-hero\s*\{[^}]*\b(height|min-height|max-height|padding|margin)\s*:/.test(css)
);

check(
  'Approved Ocean/Lime/Petrol palette tokens exist',
  /--topline-brand-primary:\s*#0c2d57/i.test(css) &&
    /--topline-page-background:\s*#f7f6f3/i.test(css) &&
    /--topline-brand-accent:\s*#b4e33d/i.test(css) &&
    /--topline-focus:\s*#0e6b78/i.test(css)
);

check(
  'Service catalogue hook and detail route remain',
  /useServices\(\{ activeOnly: true \}\)/.test(services) &&
    /\/service\//.test(services)
);

check(
  'Portfolio continues through the safe public-project loader',
  /loadPublicProjects\(\)/.test(portfolio) &&
    /from\('public_projects'\)/.test(projects) &&
    /from\('project_images'\)/.test(projects)
);

check(
  'Shop still uses product and category data hooks',
  /useProducts\(/.test(shop) && /useCategories\(/.test(shop)
);

check(
  'Cart order and coupon contracts remain present',
  /createCustomerOrder/.test(cart) && /validateCoupon/.test(cart)
);

check(
  'Contact enquiry contract remains present',
  /submitQuotationRequest/.test(contact)
);

check(
  'Customer portal source remains intact',
  /loadDashboard/.test(portal) && /signedIn/.test(portal)
);

check(
  'Quotation submission and server-derived reference remain present',
  /submitQuotationRequest/.test(quotation) &&
    /quotationRequestReference/.test(quotation)
);

check(
  'Tracking page and privacy-oriented workflow remain present',
  /track/i.test(tracking) && /order/i.test(tracking)
);

check(
  'Shared header uses approved signal-lime accent',
  /#B4E33D/i.test(header)
);

for (const item of checks) {
  console.log(`${item.pass ? 'PASS' : 'FAIL'} ${item.name}`);
}

console.log(`\nSummary: ${checks.filter((item) => item.pass).length}/${checks.length} passed.`);

if (checks.some((item) => !item.pass)) {
  process.exitCode = 1;
}