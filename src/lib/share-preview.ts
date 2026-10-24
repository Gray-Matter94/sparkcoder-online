import shareAsset from "@/assets/sparkcoder-share.jpg.asset.json";

export const SHARE_IMAGE_URL = `https://www.sparkcoder.online${shareAsset.url}`;

export const SHARE_PREVIEW_META = [
  { property: "og:image", content: SHARE_IMAGE_URL },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: "SparkCoder — ServiceNow scripting interview practice" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: SHARE_IMAGE_URL },
  { name: "twitter:image:alt", content: "SparkCoder — ServiceNow scripting interview practice" },
];