import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Loader2, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

export function WalletDashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallet();
      fetchTransactions();
    }
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching wallet:', error);
      return;
    }

    setWallet(data);
    setMpesaPhone(data.mpesa_phone || '');
    setPaypalEmail(data.paypal_email || '');
    setLoading(false);
  };

  const fetchTransactions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setTransactions(data || []);
  };

  const handleDeposit = async (method: 'mpesa' | 'paypal') => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      // Create pending transaction
      const { error } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: user!.id,
        type: 'deposit',
        amount: parseFloat(depositAmount),
        payment_method: method,
        status: 'pending',
        description: `Deposit via ${method.toUpperCase()}`
      });

      if (error) throw error;

      toast.success(`Deposit request sent. Admin will verify payment.`);
      setDepositAmount('');
      setShowDeposit(false);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleWithdraw = async (method: 'mpesa' | 'paypal') => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const { error } = await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        user_id: user!.id,
        type: 'withdrawal',
        amount: parseFloat(withdrawAmount),
        payment_method: method,
        status: 'pending',
        description: `Withdrawal to ${method.toUpperCase()}`
      });

      if (error) throw error;

      toast.success('Withdrawal request sent. Admin will process it.');
      setWithdrawAmount('');
      setShowWithdraw(false);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updatePaymentMethods = async () => {
    try {
      const { error } = await supabase
        .from('user_wallets')
        .update({
          mpesa_phone: mpesaPhone,
          paypal_email: paypalEmail
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success('Payment methods updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-primary/20 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-full">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <h2 className="text-3xl font-bold text-primary">
                ${formatNumber(wallet?.balance || 0)}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Button
            onClick={() => setShowDeposit(!showDeposit)}
            className="bg-green-600 hover:bg-green-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button
            onClick={() => setShowWithdraw(!showWithdraw)}
            variant="outline"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* Deposit Form */}
      {showDeposit && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">Deposit Funds</h3>
          <Input
            type="number"
            placeholder="Amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="mb-4"
          />
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => handleDeposit('mpesa')} className="bg-green-600 hover:bg-green-700">
              M-Pesa
            </Button>
            <Button onClick={() => handleDeposit('paypal')} className="bg-blue-600 hover:bg-blue-700">
              PayPal
            </Button>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {showWithdraw && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">Withdraw Funds</h3>
          <Input
            type="number"
            placeholder="Amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="mb-4"
          />
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => handleWithdraw('mpesa')} variant="outline">
              M-Pesa
            </Button>
            <Button onClick={() => handleWithdraw('paypal')} variant="outline">
              PayPal
            </Button>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-bold mb-4">Payment Methods</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4" />
              M-Pesa Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+254700000000"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              PayPal Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
            />
          </div>
          <Button onClick={updatePaymentMethods} className="w-full">
            Save Payment Methods
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-bold mb-4">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions yet</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    tx.type === 'deposit' || tx.type === 'earnings' 
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'earnings' ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    tx.type === 'deposit' || tx.type === 'earnings' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'deposit' || tx.type === 'earnings' ? '+' : '-'}${tx.amount}
                  </p>
                  <p className={`text-xs ${
                    tx.status === 'completed' ? 'text-green-600' :
                    tx.status === 'pending' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
