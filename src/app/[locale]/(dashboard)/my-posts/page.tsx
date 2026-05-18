import type { Metadata } from 'next';
import HomePage from '../(ai-chat)/page';

export const metadata: Metadata = {
  title: 'My Posts',
};

// Reuse the dashboard home page because the content is identical.
export default function MyPostsPage() {
  return <HomePage />;
}
