import AboutView from '@/components/pages/AboutView';

// No language in the address (the proxy redirects it to /{locale}/about); English.
export default function Page() {
  return <AboutView locale="en" />;
}
