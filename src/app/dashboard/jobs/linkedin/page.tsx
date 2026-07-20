import { LinkedInConnectClient } from '@/components/dashboard/LinkedInConnectClient';
import { getLinkedInSessionStatus } from '@/jobs/linkedin-session';

export default async function LinkedInConnectPage() {
  const status = await getLinkedInSessionStatus();
  const lastValidated = status.lastValidatedAt
    ? new Date(status.lastValidatedAt).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#afafaf]">
        Conecte a conta para buscar vagas e tentar Easy Apply. A sessão é salva após login/aprovação.
      </p>

      <LinkedInConnectClient
        connected={status.connected}
        fileExists={status.fileExists}
        lastValidated={lastValidated}
        statePath={status.path}
      />
    </div>
  );
}
