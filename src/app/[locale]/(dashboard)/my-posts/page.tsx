import type { Metadata } from 'next';
import DashboardHomePage from '../dashboard/page';

export const metadata: Metadata = {
  title: 'My Posts',
};

// Reuse the dashboard home page because the content is identical.
export default function MyPostsPage() {
  return <DashboardHomePage />;
}
