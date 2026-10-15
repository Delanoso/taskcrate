import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/data/products";

const SITE = "https://taskcrate.co.za";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/register`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  for (const product of PRODUCTS) {
    pages.push({
      url: `${SITE}/products/${product.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return pages;
}
