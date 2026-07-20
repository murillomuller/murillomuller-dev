import { auth, signOut } from '@/auth';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-[#131313] text-[#ededed]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#2a2a2a] bg-[#171717] p-4">
        <h2 className="mb-8 text-xl font-bold text-[#da0037]">Dashboard</h2>
        <DashboardNav />
        <div className="mt-4 space-y-2 border-t border-[#2a2a2a] pt-4">
          <a
            href="/api/cv?locale=en&format=pdf"
            className="block rounded px-3 py-2 text-sm text-[#afafaf] hover:bg-[#222] hover:text-white"
          >
            Test CV (PDF)
          </a>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="w-full rounded px-3 py-2 text-left text-sm text-[#da0037] hover:bg-[#222]"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
