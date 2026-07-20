import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#171717] px-4">
      <form
        action={async (formData) => {
          'use server';
          await signIn('credentials', {
            email: formData.get('email'),
            password: formData.get('password'),
            redirectTo: '/dashboard',
          });
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-[#2a2a2a] bg-[#222] p-8 shadow-xl"
      >
        <h1 className="mb-2 text-center text-xl font-bold text-[#ededed]">Admin Login</h1>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed] placeholder:text-[#747474] focus:border-[#da0037] focus:outline-none"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          className="rounded border border-[#333] bg-[#131313] p-2.5 text-sm text-[#ededed] placeholder:text-[#747474] focus:border-[#da0037] focus:outline-none"
        />
        <button
          type="submit"
          className="mt-2 rounded bg-[#da0037] p-2.5 font-bold text-white transition-opacity hover:opacity-90"
        >
          Login
        </button>
      </form>
    </div>
  );
}
