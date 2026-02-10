import { TopBar } from '@/components/layout/TopBar';
import { WalletDashboard } from '@/components/features/WalletDashboard';

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="My Wallet" showBack />
      
      <div className="max-w-2xl mx-auto p-6">
        <WalletDashboard />
      </div>
    </div>
  );
}
