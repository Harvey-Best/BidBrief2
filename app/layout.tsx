import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'BidBrief — Know the bid requirements before you price the job',
  description:
    'Turn construction bid documents into a cited checklist of deadlines, bonds, insurance, site walks, addenda, forms, and submission requirements.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
