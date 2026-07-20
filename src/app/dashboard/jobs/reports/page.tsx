import { JobsTabs } from '@/components/dashboard/JobsTabs';
import { ReportsClient } from '@/components/dashboard/ReportsClient';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <JobsTabs />
      <ReportsClient />
    </div>
  );
}
