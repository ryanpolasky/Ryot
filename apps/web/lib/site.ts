// central site metadata. canonical url is env-driven (NEXT_PUBLIC_SITE_URL).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://ryot.lol"
).replace(/\/$/, "");

export const SITE_NAME = "Ryot";
export const SITE_TAGLINE = "League Companion";
export const SITE_TITLE = "Ryot // League Companion";
export const SITE_DESCRIPTION =
  "No-ads, no-tracking League of Legends stats, live-game scout, tier lists, champion builds, and a desktop overlay. Open source and privacy-first.";

// champion on the default og share card. must be a canonical data dragon id.
export const SITE_CHAMPION = "TahmKench";

/** The author/owner, matching the @id used across ryanpolasky.com's schema graph. */
export const AUTHOR_URL = "https://ryanpolasky.com";
export const AUTHOR_ID = `${AUTHOR_URL}/#person`;
export const AUTHOR_NAME = "Ryan Polasky";

// json-ld describing ryot, kept in sync with the personal-site graph.
export function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": AUTHOR_ID,
        name: AUTHOR_NAME,
        url: `${AUTHOR_URL}/`,
        sameAs: [
          "https://www.linkedin.com/in/ryan-polasky/",
          "https://github.com/ryanpolasky",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: SITE_TITLE,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": AUTHOR_ID },
        author: { "@id": AUTHOR_ID },
        copyrightHolder: { "@id": AUTHOR_ID },
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: "Ryot - League Companion",
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        image: `${SITE_URL}/opengraph-image`,
        applicationCategory: "GameApplication",
        applicationSubCategory: "League of Legends Companion",
        operatingSystem: "Any",
        inLanguage: "en",
        isAccessibleForFree: true,
        creator: { "@id": AUTHOR_ID },
        author: { "@id": AUTHOR_ID },
        publisher: { "@id": AUTHOR_ID },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}
