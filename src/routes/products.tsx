import { createFileRoute } from '@tanstack/react-router';
import ProductsPage from '@/components/products/ProductsPage';
export const Route = createFileRoute('/products')({
  head: () => ({ meta: [
    { title: 'Jenvu Products — Terminal, News & API' },
    { name: 'description', content: 'Explore Jenvu Terminal, free News Trading and the developer API in one workspace.' },
    { property: 'og:title', content: 'Products — Jenvu' },
    { property: 'og:description', content: 'Jenvu Terminal, News Trading and the developer API.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ], links: [{ rel: 'canonical', href: 'https://jenvu.com/products' }] }),
  component: () => <ProductsPage />,
});