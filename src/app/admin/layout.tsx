import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

async function getAdminUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  return adminUser;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await getAdminUser();
  if (!adminUser) redirect('/admin/login');
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
