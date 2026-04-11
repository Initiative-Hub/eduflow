import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile',
};

export default async function ProfilePage() {
  return <section>Profile page</section>;
}
