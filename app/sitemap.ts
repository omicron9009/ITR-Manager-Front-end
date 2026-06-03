import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const domains = ['https://aikar.workpartners.co.in', 'https://workpartners.co.in'];
  const routes = [
    { path: '/', changeFrequency: 'monthly' as const, priority: 1 },
    { path: '/auth/login', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/auth/register', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/auth/reset-password', changeFrequency: 'yearly' as const, priority: 0.5 },
    { path: '/privacy-policy', changeFrequency: 'yearly' as const, priority: 0.3 },
  ];

  return domains.flatMap((base) =>
    routes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
  );
}
