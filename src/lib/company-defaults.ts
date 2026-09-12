/**
 * Launch-safe public identity used only before the CMS database record is
 * available. These values mirror the currently published Topline site and
 * must be replaced through the CMS when the client confirms new addresses.
 */
export const TOPLINE_COMPANY = {
  name: 'Topline Flooring and Waterproofing',
  email: 'toplineflooringandwaterproofin@gmail.com',
  phone: '0720 859 737 / 0755 293 372',
  whatsapp: '+254720859737',
  url: 'https://toplineflooringandwaterproofing.co.ke',
} as const;
