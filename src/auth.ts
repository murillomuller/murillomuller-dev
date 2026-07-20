import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        if (credentials.email === adminEmail && credentials.password === adminPassword) {
          return { id: '1', name: 'Admin', email: adminEmail };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect to signIn
      }
      return true;
    },
  },
  secret: process.env.AUTH_SECRET || 'secret123',
});
