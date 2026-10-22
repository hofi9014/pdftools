import HelpView from '@/components/pages/HelpView';
import { helpData } from '@/content/pages/help';

// No language in the address: the view follows the visitor's stored one, so it gets them all.
export default function Page() {
  return <HelpView helpData={helpData} />;
}
