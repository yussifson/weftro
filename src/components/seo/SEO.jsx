import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title, 
  description, 
  image, 
  url, 
  type = 'website', 
  organizationName = 'Weftro',
  noindex = false,
  structuredData
}) {
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://weftro.com';
    
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : origin);
  const imageUrl = image || `${origin}/clipad-logo.svg`;
  const defaultTitle = "Weftro V3 — #1 Enterprise Intelligence Platform";
  const defaultDesc = "Weftro V3 helps companies search connected knowledge sources, discover relevant information, retrieve evidence-grounded answers, and connect company knowledge with compatible applications and AI systems.";

  const effectiveTitle = title || defaultTitle;
  const effectiveDesc = description || defaultDesc;

  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": effectiveTitle,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "url": currentUrl,
    "description": effectiveDesc,
    "publisher": {
      "@type": "Organization",
      "name": organizationName,
      "url": "https://weftro.com",
      "logo": `${origin}/clipad-logo.svg`
    }
  };

  const schemaToRender = structuredData || defaultStructuredData;

  return (
    <Helmet>
      {/* Standard SEO */}
      <title>{effectiveTitle}</title>
      <meta name="description" content={effectiveDesc} />
      <link rel="canonical" href={currentUrl} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={effectiveTitle} />
      <meta property="og:description" content={effectiveDesc} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Weftro" />

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={effectiveTitle} />
      <meta name="twitter:description" content={effectiveDesc} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Structured Data Schema */}
      <script type="application/ld+json">
        {JSON.stringify(schemaToRender)}
      </script>
    </Helmet>
  );
}
