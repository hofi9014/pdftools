import UploadComparisonView from '@/components/pages/UploadComparisonView';

// No language in the address (the proxy redirects it to /{locale}/where-your-file-goes); English.
export default function Page() {
  return <UploadComparisonView locale="en" />;
}
