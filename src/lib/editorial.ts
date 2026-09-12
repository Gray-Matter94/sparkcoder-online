export const SITE_URL = "https://www.sparkcoder.online";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const EDITORIAL_TEAM_ID = `${SITE_URL}/about#editorial-team`;

export const SPARKCODER_ORGANIZATION = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "SparkCoder",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/android-chrome-192x192.png`,
  },
} as const;

export const SPARKCODER_EDITORIAL_TEAM = {
  "@type": "Organization",
  "@id": EDITORIAL_TEAM_ID,
  name: "SparkCoder Editorial Team",
  url: `${SITE_URL}/about`,
  parentOrganization: { "@id": ORGANIZATION_ID },
} as const;

export function createTechArticleSchema(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  about?: string;
  audienceType?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: SPARKCODER_EDITORIAL_TEAM,
    publisher: SPARKCODER_ORGANIZATION,
    ...(input.about ? { about: input.about } : {}),
    ...(input.audienceType
      ? { audience: { "@type": "Audience", audienceType: input.audienceType } }
      : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}