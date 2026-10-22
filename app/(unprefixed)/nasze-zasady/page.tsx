import RulesView from '@/components/pages/RulesView';
import { content } from '@/content/pages/nasze-zasady';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <RulesView content={content} />;
}
