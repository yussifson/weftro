/**
 * SlateSitesAI.js
 * AI-powered generation engine for Slate Sites
 * Uses Cloudflare Workers AI (Kimi K3: moonshotai/kimi-k3) via existing cloudflareAI.js
 */

import { generateText } from '@/lib/cloudflareAI';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a JSON response from the AI, handling markdown code fences
 */
function parseJsonResponse(text) {
  try {
    // Strip ```json ... ``` markdown blocks
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('AI JSON parse failed. Raw:', text);
    throw new Error('AI returned malformed JSON. Please try again.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY PRESETS — used to prime AI with domain knowledge
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_PRESETS = {
  law: {
    tone: 'professional, authoritative, trustworthy',
    keyPages: ['Home', 'Practice Areas', 'Our Team', 'About', 'Contact'],
    keyFeatures: ['Free consultation booking', 'Case types', 'Attorney profiles', 'Client testimonials'],
    colors: { primary: '#1e3a5f', secondary: '#c9a84c' },
    font: 'Playfair Display',
  },
  hospital: {
    tone: 'warm, caring, professional, reassuring',
    keyPages: ['Home', 'Services', 'Doctors', 'Appointments', 'Patient Info', 'Contact'],
    keyFeatures: ['Online appointment booking', 'Doctor profiles', 'Emergency contact', 'Insurance info'],
    colors: { primary: '#0d6efd', secondary: '#20c997' },
    font: 'Inter',
  },
  restaurant: {
    tone: 'warm, inviting, appetizing, local',
    keyPages: ['Home', 'Menu', 'Reservations', 'About', 'Gallery', 'Contact'],
    keyFeatures: ['Live menu', 'Online reservations', 'Photo gallery', 'Special offers'],
    colors: { primary: '#b5451b', secondary: '#f4c542' },
    font: 'Lora',
  },
  hotel: {
    tone: 'luxurious, welcoming, sophisticated',
    keyPages: ['Home', 'Rooms', 'Amenities', 'Dining', 'Bookings', 'Contact'],
    keyFeatures: ['Room booking', 'Amenity showcase', 'Gallery', 'Special packages'],
    colors: { primary: '#1a1a2e', secondary: '#c9a87d' },
    font: 'Cormorant Garamond',
  },
  school: {
    tone: 'encouraging, professional, community-focused',
    keyPages: ['Home', 'Admissions', 'Programs', 'Faculty', 'News', 'Contact'],
    keyFeatures: ['Admissions application', 'Program info', 'Staff profiles', 'Events calendar'],
    colors: { primary: '#1565c0', secondary: '#fdd835' },
    font: 'Inter',
  },
  retail: {
    tone: 'energetic, friendly, deal-focused',
    keyPages: ['Home', 'Shop', 'Categories', 'About', 'Contact'],
    keyFeatures: ['Product catalog', 'Promotions', 'Store locator', 'Customer reviews'],
    colors: { primary: '#e53935', secondary: '#43a047' },
    font: 'Inter',
  },
  agency: {
    tone: 'creative, bold, innovative, results-driven',
    keyPages: ['Home', 'Services', 'Work/Portfolio', 'Team', 'About', 'Contact'],
    keyFeatures: ['Portfolio showcase', 'Service packages', 'Case studies', 'Client logos'],
    colors: { primary: '#6c63ff', secondary: '#ff6584' },
    font: 'Outfit',
  },
  general: {
    tone: 'professional, clear, helpful',
    keyPages: ['Home', 'About', 'Services', 'Contact'],
    keyFeatures: ['Service overview', 'Contact form', 'About section', 'Testimonials'],
    colors: { primary: '#6366f1', secondary: '#8b5cf6' },
    font: 'Inter',
  },
};

function getPreset(industry) {
  return INDUSTRY_PRESETS[industry] || INDUSTRY_PRESETS.general;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL COMPONENT DEFINITIONS — High-power, industry-agnostic blocks
// ─────────────────────────────────────────────────────────────────────────────

const VALID_SECTION_TYPES = [
  'hero', 'features', 'testimonials', 'pricing', 'faq', 'gallery',
  'team', 'cta', 'contact', 'stats', 'logos', 'timeline', 'video',
  'form', 'booking', 'products', 'menu', 'jobs', 'blog', 'map', 'chat',
];

// Provide hints to the AI on how to creatively use these universal blocks for ANY industry
const UNIVERSAL_BLOCK_HINTS = `
- 'hero': The main banner. Works for SaaS, restaurants, clinics, anything.
- 'features': Versatile grid. Use for "Our Services", "Why Choose Us", or "Practice Areas".
- 'stats': Great for "Cases Won", "Years in Business", "Patients Served", or "ROI".
- 'products' / 'menu': Can be used for digital products, physical goods, food, or service packages.
- 'booking': Universal appointment CTA for law, medical, salons, or B2B sales calls.
- 'team': Use for "Our Attorneys", "Our Doctors", "Leadership", or "Founders".
- 'timeline': Use for "Company History", "Our Process", or "How It Works".
- 'logos': Use for "As Seen In", "Our Clients", or "Partners".
- 'form': Universal lead capture. Customize fields for consultation, support, or generic contact.
- 'jobs': Use for hiring pages in any industry.
- 'blog': Universal news/updates section.
`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GENERATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate an entire site structure from a user prompt
 * @param {string} prompt — e.g. "Build a law firm website for Smith & Associates"
 * @param {string} industry — e.g. "law", "hospital", "restaurant"
 * @param {object} brand — optional { name, tagline, colors }
 * @returns {object} — site structure with pages + sections
 */
export async function generateSiteFromPrompt(prompt, industry = 'general', brand = {}) {
  const preset = getPreset(industry);
  const brandName = brand.name || 'Our Business';
  const brandTagline = brand.tagline || '';

  const systemPrompt = `You are an expert website designer and copywriter for ${industry} businesses.
You design beautiful, professional, conversion-optimized websites.
Tone: ${preset.tone}
Always output ONLY valid JSON — no markdown, no explanation.`;

  const userPrompt = `Create a complete website structure for this request:
"${prompt}"

Business name: ${brandName}
${brandTagline ? `Tagline: ${brandTagline}` : ''}
Industry: ${industry}
Tone: ${preset.tone}

Generate a website with these pages: ${preset.keyPages.join(', ')}

For each page, design sections using these universal building blocks: ${VALID_SECTION_TYPES.join(', ')}
${UNIVERSAL_BLOCK_HINTS}

Think creatively! Use any block that best serves the content, regardless of the industry.
Output JSON in this EXACT format:
{
  "siteName": "...",
  "siteTagline": "...",
  "siteDescription": "...",
  "industry": "${industry}",
  "theme": {
    "primaryColor": "${preset.colors.primary}",
    "secondaryColor": "${preset.colors.secondary}",
    "fontFamily": "${preset.font}",
    "headingFont": "${preset.font}",
    "borderRadius": "12px",
    "darkMode": false
  },
  "pages": [
    {
      "title": "Home",
      "slug": "/",
      "isHome": true,
      "type": "home",
      "sections": [
        {
          "id": "unique-id-1",
          "type": "hero",
          "data": {
            "headline": "...",
            "subheadline": "...",
            "ctaText": "...",
            "ctaLink": "/contact",
            "ctaSecondaryText": "...",
            "ctaSecondaryLink": "#",
            "backgroundType": "gradient",
            "backgroundImage": null
          }
        }
      ]
    }
  ]
}

Rules:
- Each section must have a unique "id" (use format: "section-type-timestamp")
- The hero section must be first on the home page
- Include 3-6 sections per page
- Write real, compelling copy (not placeholders)
- Contact page must include a "form" section and a "contact" section
- Make the copy specific to the business described in the prompt`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

/**
 * Generate a single page from a prompt
 * @param {string} prompt — e.g. "An about page for a modern dental clinic"
 * @param {string} pageType — e.g. "about", "services", "contact"
 * @param {object} siteContext — { siteName, industry, theme }
 * @returns {object} — { title, slug, sections }
 */
export async function generatePageFromPrompt(prompt, pageType, siteContext = {}) {
  const preset = getPreset(siteContext.industry || 'general');

  const systemPrompt = `You are an expert website copywriter and UX designer.
Output ONLY valid JSON. No markdown. No explanation.`;

  const userPrompt = `Create a single website page for this request: "${prompt}"
Page type: ${pageType}
Site: ${siteContext.siteName || 'Our Business'}
Industry: ${siteContext.industry || 'general'}
Tone: ${preset.tone}

Output JSON:
{
  "title": "...",
  "slug": "/${pageType}",
  "type": "${pageType}",
  "isHome": false,
  "sections": [
    {
      "id": "section-hero-001",
      "type": "hero",
      "data": { "headline": "...", "subheadline": "..." }
    }
  ]
}

Include 3-5 sections using: ${VALID_SECTION_TYPES.join(', ')}
Write real, compelling copy tailored to the business.`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

/**
 * Generate copy for a specific section type
 * @param {string} sectionType — e.g. "hero", "features", "testimonials"
 * @param {object} context — { siteName, industry, tone, existingContent }
 * @returns {object} — section data object
 */
export async function generateSectionCopy(sectionType, context = {}) {
  const preset = getPreset(context.industry || 'general');

  const systemPrompt = `You are an expert copywriter for ${context.industry || 'business'} websites.
Tone: ${preset.tone}. Output ONLY valid JSON.`;

  const userPrompt = `Write compelling copy for a "${sectionType}" website section.
Business: ${context.siteName || 'Our Business'}
Industry: ${context.industry || 'general'}
${context.existingContent ? `Current content to improve: ${JSON.stringify(context.existingContent)}` : ''}

Output JSON with all the content fields for this section type.
For "hero": { headline, subheadline, ctaText, ctaLink, ctaSecondaryText }
For "features": { headline, subheadline, features: [{icon, title, description}] }
For "testimonials": { headline, testimonials: [{name, role, company, text, rating}] }
For "faq": { headline, faqs: [{question, answer}] }
For "stats": { headline, stats: [{value, label, icon}] }
For "team": { headline, subheadline, members: [{name, role, bio}] }
For "cta": { headline, subheadline, ctaText, ctaLink }
For "pricing": { headline, subheadline, plans: [{name, price, period, features, ctaText, featured}] }
For "contact": { headline, subheadline, email, phone, address, mapUrl }
Write real, specific content — not generic placeholders.`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

/**
 * Suggest sections to add to a page
 * @param {string} industry
 * @param {string} pageType
 * @param {Array} existingSections — array of section types already on the page
 * @returns {Array} — [{ type, label, description, priority }]
 */
export async function suggestSections(industry, pageType, existingSections = []) {
  const preset = getPreset(industry);

  const systemPrompt = `You are a UX expert for ${industry} websites. Output ONLY valid JSON.`;

  const userPrompt = `Suggest the best sections to add to a "${pageType}" page for a ${industry} business.

Already has: ${existingSections.join(', ') || 'nothing yet'}
Available section types: ${VALID_SECTION_TYPES.join(', ')}
Key features for this industry: ${preset.keyFeatures.join(', ')}

Output JSON array:
[
  {
    "type": "features",
    "label": "Key Features",
    "description": "Showcase your main service highlights",
    "priority": "high"
  }
]
Suggest 5-8 sections. Priority: high/medium/low.`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

/**
 * Improve/rewrite existing copy with better tone
 * @param {string} text — existing copy text
 * @param {string} tone — "professional", "friendly", "luxury", "energetic"
 * @param {string} context — what the text is for
 * @returns {string} — improved copy
 */
export async function improveCopy(text, tone = 'professional', context = '') {
  const response = await generateText([
    {
      role: 'system',
      content: `You are a professional copywriter. Rewrite text to be more ${tone}. Return ONLY the improved text.`,
    },
    {
      role: 'user',
      content: `Improve this ${context} copy to be more ${tone}:\n\n"${text}"\n\nReturn only the improved version, no explanation.`,
    },
  ]);
  return response.trim().replace(/^["']|["']$/g, '');
}

/**
 * Auto-generate SEO metadata for a page
 * @param {string} pageTitle
 * @param {string} pageContent — plain text summary of page content
 * @param {string} siteName
 * @returns {{ title, description, keywords }}
 */
export async function generateSEO(pageTitle, pageContent, siteName) {
  const systemPrompt = `You are an SEO expert. Output ONLY valid JSON.`;

  const userPrompt = `Generate SEO metadata for this page:
Page title: "${pageTitle}"
Site: "${siteName}"
Content summary: "${pageContent?.slice(0, 500) || ''}"

Output JSON:
{
  "title": "...",
  "description": "...",
  "keywords": "..."
}
Title: 50-60 chars, include site name at end
Description: 150-160 chars, compelling and keyword-rich
Keywords: 5-8 relevant keywords, comma-separated`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

/**
 * Generate theme colors for a given industry + brand description
 * @param {string} industry
 * @param {string} brandDescription — e.g. "modern, luxury spa"
 * @returns {{ primaryColor, secondaryColor, fontFamily, headingFont }}
 */
export async function generateTheme(industry, brandDescription = '') {
  const systemPrompt = `You are a UI/UX designer expert in web color theory. Output ONLY valid JSON.`;

  const userPrompt = `Design a color theme for a ${industry} website.
Brand: "${brandDescription}"

Output JSON:
{
  "primaryColor": "#hexcode",
  "secondaryColor": "#hexcode",
  "accentColor": "#hexcode",
  "backgroundColor": "#hexcode",
  "textColor": "#hexcode",
  "fontFamily": "Google Font name",
  "headingFont": "Google Font name",
  "mood": "one word describing the feel"
}
Use professional hex colors. Choose Google Fonts that fit the brand personality.`;

  const response = await generateText([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return parseJsonResponse(response);
}

export default {
  generateSiteFromPrompt,
  generatePageFromPrompt,
  generateSectionCopy,
  suggestSections,
  improveCopy,
  generateSEO,
  generateTheme,
};
