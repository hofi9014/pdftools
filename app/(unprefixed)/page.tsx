import HomeView from '@/components/pages/HomeView';
import { homeGuideCards } from '@/lib/guide-cards';

// No language in the address: the view follows the visitor's stored one, so the guide cards come
// in all languages (four titles and excerpts).
export default function Home() {
  return <HomeView guides={homeGuideCards()} />;
}
