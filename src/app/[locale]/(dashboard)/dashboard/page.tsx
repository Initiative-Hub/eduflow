import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardHomePage() {
  return (
    <div>
      <h1>Welcome to the Dashboard!</h1>
    </div>
  );
}
