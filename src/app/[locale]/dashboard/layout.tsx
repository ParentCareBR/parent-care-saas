import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import { CaredPersonProvider } from '@/contexts/CaredPersonContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CaredPersonProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </CaredPersonProvider>
    </AuthProvider>
  );
}
