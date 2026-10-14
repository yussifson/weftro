import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title, 
  description, 
  image, 
  url, 
  type = 'website', 
  organizationName,
  noindex = false
}) {
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://clipad.com';
    
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : origin);
  const imageUrl = image || `${origin}/clipad-logo.svg`;
  const defaultDesc = "Weftro is an enterprise-grade AI-powered collaborative organizational memory platform that unifies live HD meetings, async video, instant chat, spaces, and automated decision ledgers.";

  return (
    <Helmet>
      {/* Standard SEO */}
      {title && <title>{title}</title>}
      <meta name="description" content={description || defaultDesc} />
      <link rel="canonical" href={currentUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      {title && <meta property="og:title" content={title} />}
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Weftro" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      {title && <meta name="twitter:title" content={title} />}
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Structured Data Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": title || "Weftro",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "All",
          "url": currentUrl,
          "description": description || defaultDesc,
          "publisher": {
            "@type": "Organization",
            "name": organizationName || "Weftro",
            "url": "https://weftro.com",
            "logo": `${origin}/clipad-logo.svg`
          }
        })}
      </script>
    </Helmet>
  );
}
