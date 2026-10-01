// Single source of truth for all pricing. Never hardcode a price elsewhere.
// All values in USD cents. 4900 = .

export const PRICES = {
  starter: {
    global:    { monthly: 0,     annual: 0     },
    emerging:  { monthly: 0,     annual: 0     },
    community: { monthly: 0,     annual: 0     },
    education: { monthly: 0,     annual: 0     }},
  professional: {
    global:    { monthly: 4900,  annual: 3900  },
    emerging:  { monthly: 2900,  annual: 2320  },
    community: { monthly: 900,   annual: 720   },
    education: { monthly: 2900,  annual: 2320  }},
  business: {
    global:    { monthly: 9900,  annual: 7900  },
    emerging:  { monthly: 4900,  annual: 3920  },
    community: { monthly: 1900,  annual: 1520  },
    education: { monthly: 6900,  annual: 5520  }},
  enterprise: {
    global:    { monthly: 24900, annual: 19900 },
    emerging:  { monthly: 9900,  annual: 7920  },
    community: { monthly: 4900,  annual: 3920  },
    education: { monthly: 6900,  annual: 5520  }}};

export function getPrice(plan, tier, cycle) {
  return PRICES[plan]?.[tier]?.[cycle] ?? 0;
}

export function formatPrice(cents) {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0}).format(cents / 100);
}

export function formatPriceNumber(cents) {
  if (cents === 0) return '0';
  return String(Math.round(cents / 100));
}

export const GLOBAL_COUNTRIES = new Set([
  'US','GB','CA','AU','NZ','DE','FR','NL','SE','NO','DK','FI','CH','AT','BE',
  'IE','LU','SG','JP','KR','IL','AE','SA','QA','KW','BH','OM',
]);

export const EMERGING_COUNTRIES = new Set([
  'GH','NG','KE','TZ','UG','ZA','EG','MA','SN','ET','RW','ZW','ZM','MZ','MW',
  'BW','NA','AO','SL','LR','GN','ML','BF','BJ','TG','GW','MR','GM','CV','DJ',
  'ER','SO','SS','MG','MU','SC','LS','SZ','KM','CM','CI','CD','CG','CF','TD',
  'IN','ID','PH','VN','MM','KH','LA','BD','NP','LK','PK','TL','TH','MY',
  'GT','HN','SV','NI','BO','PY','PE','EC','CO','VE','GY','SR','BR','MX','CL','AR',
  'IQ','YE','SY','JO','LB','PS','SD','LY','DZ','TN',
]);

export function countryToTier(countryCode) {
  if (!countryCode) return 'global';
  const c = countryCode.toUpperCase().trim();
  if (['T1','XX','A1','--'].includes(c)) return 'global';
  if (GLOBAL_COUNTRIES.has(c)) return 'global';
  if (EMERGING_COUNTRIES.has(c)) return 'emerging';
  return 'global';
}

export function orgTypeToTier(orgType, countryTier) {
  if (['ngo','church','mosque'].includes(orgType)) return 'community';
  if (['school','university'].includes(orgType)) return 'education';
  return countryTier;
}

const TIER_CACHE_KEY    = 'slate_pricing_tier';
const COUNTRY_CACHE_KEY = 'slate_pricing_country';
const OVERRIDE_KEY      = 'slate_tier_override';
const VALID_TIERS       = new Set(['global','emerging','community','education']);

export async function detectMarketTier() {
  const override = localStorage.getItem(OVERRIDE_KEY);
  if (override && VALID_TIERS.has(override)) {
    return { tier: override, country: localStorage.getItem(COUNTRY_CACHE_KEY) || 'manual', source: 'override' };
  }
  const cached = localStorage.getItem(TIER_CACHE_KEY);
  const cachedCountry = localStorage.getItem(COUNTRY_CACHE_KEY);
  if (cached && VALID_TIERS.has(cached) && cachedCountry) {
    return { tier: cached, country: cachedCountry, source: 'cache' };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('non-200');
    const data = await res.json();
    const country = (data.country_code || 'US').toUpperCase().trim();
    const tier = countryToTier(country);
    localStorage.setItem(TIER_CACHE_KEY, tier);
    localStorage.setItem(COUNTRY_CACHE_KEY, country);
    return { tier, country, source: 'geo' };
  } catch (_) {
    return { tier: 'global', country: 'US', source: 'fallback' };
  }
}

export function setTierOverride(tier) {
  if (!VALID_TIERS.has(tier)) return;
  localStorage.setItem(OVERRIDE_KEY, tier);
  localStorage.setItem(TIER_CACHE_KEY, tier);
}

export function clearTierOverride() {
  localStorage.removeItem(OVERRIDE_KEY);
  localStorage.removeItem(TIER_CACHE_KEY);
  localStorage.removeItem(COUNTRY_CACHE_KEY);
}

export function assertPricingIntegrity() {
  const paid  = ['professional','business','enterprise'];
  const tiers = ['global','emerging','community','education'];
  const order = ['starter','professional','business','enterprise'];
  for (const pk of paid) {
    for (const tier of tiers) {
      const mo = PRICES[pk][tier].monthly;
      const an = PRICES[pk][tier].annual;
      if (an >= mo) throw new Error('[pricing] Annual >= monthly: ' + pk + '/' + tier);
      const disc = (mo - an) / mo;
      if (disc < 0.15 || disc > 0.35) throw new Error('[pricing] Discount out of range: ' + pk + '/' + tier);
    }
    if (PRICES[pk]['emerging'].monthly >= PRICES[pk]['global'].monthly) throw new Error('[pricing] emerging >= global for ' + pk);
    if (PRICES[pk]['community'].monthly >= PRICES[pk]['emerging'].monthly) throw new Error('[pricing] community >= emerging for ' + pk);
  }
  for (const tier of tiers) {
    for (let i = 1; i < order.length; i++) {
      if (PRICES[order[i]][tier].monthly < PRICES[order[i-1]][tier].monthly)
        throw new Error('[pricing] Price regression: ' + order[i] + '/' + tier);
    }
  }
  console.log('Pricing integrity passed');
}

export const PLAN_META = {
  starter:      { name:'Starter',      tagline:'Get started for free',           quota:'Up to 10 Internal Users',   storage:'10 GB',  aiTokens:'None',                 popular:false, highlight:false, cta:'Get started free'   },
  professional: { name:'Professional', tagline:'For growing teams',               quota:'Up to 10 Internal Users',  storage:'500 GB', aiTokens:'50,000 / mo',          popular:true,  highlight:true,  cta:'Start 14-day trial'  },
  business:     { name:'Business',     tagline:'For scaling organizations',       quota:'Up to 20 Internal Users',  storage:'5 TB',   aiTokens:'200,000 / mo',            popular:false, highlight:false, cta:'Start 14-day trial'  },
  enterprise:   { name:'Enterprise',   tagline:'Custom-fit for large enterprise', quota:'Unlimited Internal Users', storage:'Custom', aiTokens:'Unlimited + Priority', popular:false, highlight:false, cta:'Upgrade'       }};

export const TIER_META = {
  global:    { name:'Global',    desc:'US, UK, EU, Gulf, AU, JP, KR', badge:null        },
  emerging:  { name:'Emerging',  desc:'Africa, SE Asia, LatAm',       badge:'~60% off'  },
  community: { name:'Community', desc:'NGOs, Churches, Nonprofits',   badge:'~80% off'  },
  education: { name:'Education', desc:'Schools & Universities',       badge:'~40% off'  }};

export const UNIVERSAL_FEATURES = [
  'All 14 Work Slate Modules',
  'Unlimited External Users (Clients/Students)',
  'Unified Chat, Email & Video',
  'HR, Payroll & Leave Management',
  'Billing, Invoicing & Paystack Payments',
  'Offline-first sync via PowerSync',
  'Role-Based Access Control',
  'Orbit AI Assistant',
  'Custom Branding & White-labelling',
];
