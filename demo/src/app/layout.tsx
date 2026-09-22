import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Context Lab · Conversational retrieval', description: 'Compare retrieval methods over a shared document collection.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
