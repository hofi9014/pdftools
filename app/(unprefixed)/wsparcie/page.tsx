import SupportView from '@/components/pages/SupportView';
import { content } from '@/content/pages/wsparcie';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <SupportView content={content} />;
}
