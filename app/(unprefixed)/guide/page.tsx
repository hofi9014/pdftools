import GuideView from '@/components/pages/GuideView';
import { guideData } from '@/content/pages/guide';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <GuideView guideData={guideData} />;
}
