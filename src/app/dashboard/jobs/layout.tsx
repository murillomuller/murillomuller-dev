import { JobsTabs } from '@/components/dashboard/JobsTabs';

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#da0037]">Vagas</h1>
        <p className="mt-2 text-sm text-[#afafaf]">
          Busca, candidaturas, revisão, preferências e sessão LinkedIn — tudo aqui.
        </p>
      </div>
      <JobsTabs />
      <div>{children}</div>
    </div>
  );
}
