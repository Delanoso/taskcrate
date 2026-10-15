import type { MetadataRoute } from "next";

const SITE = "https://taskcrate.co.za";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api/",
        "/checkout",
        "/forgot-password",
        "/reset-password",
        "/p/",
        "/t/",
        "/s/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
