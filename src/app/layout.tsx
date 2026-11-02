import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Rivision | AI-Powered Spaced Repetition',
  description: 'Master any subject with AI-generated revision questions and spaced repetition.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen antialiased nb-bg`}>
        <Providers>
          <Navbar />
          <main className="pt-20">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
