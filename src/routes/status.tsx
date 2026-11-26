import { createFileRoute } from '@tanstack/react-router';
import ServiceStatusPage, { serviceStatusQuery } from '@/components/ServiceStatusPage';
export const Route = createFileRoute('/status')({
  head: () => ({ meta: [
    { title: 'Jenvu Service Status — Live Availability' },
    { name: 'description', content: 'Live availability checks and recorded service history for Jenvu Platform, developer API, and Gold quotes.' },
    { property: 'og:title', content: 'Jenvu Service Status' },
    { property: 'og:description', content: 'Current Jenvu service availability and genuine recorded observations.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ], links: [{ rel: 'canonical', href: 'https://status.jenvu.com/' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(serviceStatusQuery),
  component: () => <ServiceStatusPage />,
});