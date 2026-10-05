import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url, type = 'website', organizationName }) {
  const siteUrl = window.location.origin;
  const currentUrl = url || window.location.href;
  const imageUrl = image || `${siteUrl}/optavel-favicon.svg`;
  const defaultDesc = "KERINT is an enterprise-grade collaborative productivity workspace that unifies chat, spaces, video meetings, and action items in one place.";

  return (
    <Helmet>
      {/* Standard SEO */}
      {title && <title>{title}</title>}
      <meta name="description" content={description || defaultDesc} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      {title && <meta property="og:title" content={title} />}
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      {title && <meta name="twitter:title" content={title} />}
      <meta name="twitter:description" content={description || defaultDesc} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Schema */}
      {organizationName && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": title || organizationName,
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Any",
            "url": currentUrl,
            "publisher": {
              "@type": "Organization",
              "name": "Optavel",
              "url": "https://optavel.com"
            }
          })}
        </script>
      )}
    </Helmet>
  );
}
