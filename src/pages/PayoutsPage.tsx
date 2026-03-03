import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DollarSign, TrendingUp, Wallet, Download, Loader2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function PayoutsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [monetization, setMonetization] = useState<any>(null);
  const [revenueShare, setRevenueShare] = useState<any>(null);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch monetization status
      const { data: monetizationData } = await supabase
        .from('user_monetization')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      setMonetization(monetizationData);
      setPaypalEmail(monetizationData?.paypal_email || '');

      // Fetch revenue share
      const { data: revenueData } = await supabase
        .from('revenue_shares')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      setRevenueShare(revenueData);

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .in('type', ['earnings', 'withdrawal', 'platform_share'])
        .order('created_at', { ascending: false })
        .limit(50);

      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePayPalEmail = async () => {
    if (!paypalEmail.trim()) {
      toast.error('Please enter a valid PayPal email');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_monetization')
        .update({ paypal_email: paypalEmail })
        .eq('user_id', user!.id);

      if (error) throw error;
      toast.success('PayPal email updated');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!paypalEmail) {
      toast.error('Please set your PayPal email first');
      return;
    }

    if (amount > (monetization?.pending_user_payout || 0)) {
      toast.error('Insufficient funds available for withdrawal');
      return;
    }

    try {
      // Create withdrawal transaction
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet!.id,
          user_id: user!.id,
          type: 'withdrawal',
          amount: amount,
          payment_method: 'paypal',
          status: 'pending',
          description: 'PayPal withdrawal request',
          metadata: {
            paypal_email: paypalEmail
          }
        });

      if (error) throw error;

      // Update pending payout
      await supabase
        .from('user_monetization')
        .update({
          pending_user_payout: (monetization.pending_user_payout || 0) - amount
        })
        .eq('user_id', user!.id);

      toast.success('Withdrawal request submitted! Funds will be sent to your PayPal within 2-5 business days.');
      setWithdrawAmount('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!monetization?.is_monetized) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <TopBar title="Payouts" showBack />
        <div className="max-w-2xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Monetization Not Enabled</h2>
            <p className="text-muted-foreground mb-6">
              You need to be monetized to receive ad revenue and payouts
            </p>
            <Button onClick={() => navigate('/monetization')}>
              Go to Monetization
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const platformShare = monetization?.platform_share_percentage || 70;
  const userShare = monetization?.user_share_percentage || 30;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Payouts & Revenue" showBack />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Your Share ({userShare}%)</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              ${(revenueShare?.user_share || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total earned</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Available</span>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              ${(monetization?.pending_user_payout || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </div>

          <div className="border border-border rounded-xl p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-muted-foreground">Platform Share ({platformShare}%)</span>
            </div>
            <p className="text-3xl font-bold text-purple-600">
              ${(revenueShare?.platform_share || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Platform revenue</p>
          </div>
        </div>

        {/* PayPal Configuration */}
        <div className="border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">PayPal Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Your PayPal Email</label>
              <div className="flex gap-2">
                <Input
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="your.email@paypal.com"
                  type="email"
                  className="flex-1"
                />
                <Button onClick={updatePayPalEmail}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Withdrawals will be sent to this PayPal account
              </p>
            </div>
          </div>
        </div>

        {/* Withdrawal */}
        <div className="border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Request Withdrawal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Amount (USD)</label>
              <Input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                max={monetization?.pending_user_payout || 0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: ${(monetization?.pending_user_payout || 0).toFixed(2)}
              </p>
            </div>

            <Button 
              onClick={requestWithdrawal} 
              className="w-full"
              disabled={!paypalEmail || !withdrawAmount}
            >
              <Download className="w-4 h-4 mr-2" />
              Request Withdrawal to PayPal
            </Button>

            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p className="font-semibold mb-2">Withdrawal Information:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Processing time: 2-5 business days</li>
                <li>• Minimum withdrawal: $10.00</li>
                <li>• PayPal fees may apply</li>
                <li>• Revenue is split: {userShare}% to you, {platformShare}% to platform</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === 'earnings' ? 'text-green-600' : 
                      tx.type === 'withdrawal' ? 'text-red-600' : 
                      'text-muted-foreground'
                    }`}>
                      {tx.type === 'earnings' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tx.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                      tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
