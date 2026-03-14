import { redirect } from 'next/navigation';

export default function Home() {
  // Skip login for now - go straight to dashboard
  redirect('/dashboard/bill-negotiator');
}
