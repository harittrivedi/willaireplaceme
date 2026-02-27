import type { Metadata } from 'next';
import { Share_Tech_Mono, Inter } from 'next/font/google';
import './globals.css';

const techMono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--font-tech' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'WILL AI REPLACE ME // System Diagnostic',
  description: 'A deep futuristic analysis of your career trajectory in the age of Artificial Intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${techMono.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
