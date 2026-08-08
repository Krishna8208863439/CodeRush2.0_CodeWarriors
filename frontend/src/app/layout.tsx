import './globals.css';
import Providers from '../components/Providers';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'Community Redressal Planner — Municipal Civic Operating System',
  description: 'AI-Powered Government Grievance Redressal, Relational Audit Trails, Smart Department Routing & SLA Tracking Operating System.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}

