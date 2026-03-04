import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { DashboardProvider } from '@/components/dashboard/DashboardContext';

export default function Home() {
  return (
    <DashboardProvider>
      <DashboardLayout />
    </DashboardProvider>
  );
}
