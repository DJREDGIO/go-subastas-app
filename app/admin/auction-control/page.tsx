
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { UserType } from '@prisma/client';
import { AdminLayout } from '@/components/admin/admin-layout';
import { AuctionControl } from '@/components/admin/auction-control';

export default async function AdminAuctionControlPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  if (session.user.userType !== UserType.ADMIN) {
    redirect('/dashboard');
  }

  return (
    <AdminLayout user={session.user}>
      <AuctionControl />
    </AdminLayout>
  );
}
