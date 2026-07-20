import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  weight: ['100', '200', '400', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Murillo Müller - Fullstack Developer',
  description: 'Personal Portfolio & CV',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${poppins.variable} font-sans bg-[#171717] text-[#ededed] antialiased`}>
        {children}
      </body>
    </html>
  );
}
