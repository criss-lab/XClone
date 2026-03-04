import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Loader2, Phone, Mail, AlertCircle, CheckCircle2, Filter, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatNumber } from '@/lib/utils';

export function WalletDashboard() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading, fetchWallet, updatePaymentMethods } = useWallet();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  
  // Transaction filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, filterType, filterStatus, filterPaymentMethod, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (wallet) {
      setMpesaPhone(wallet.mpesa_phone || '');
      setPaypalEmail(wallet.paypal_email || '');
      setLoading(false);
    }
  }, [wallet]);

  const fetchTransactions = async () => {
    if (!user) return;

    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters
    if (filterType !== 'all') {
      query = query.eq('type', filterType);
    }
    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }
    if (filterPaymentMethod !== 'all') {
      query = query.eq('payment_method', filterPaymentMethod);
    }
    if (filterDateFrom) {
      query = query.gte('created_at', new Date(filterDateFrom).toISOString());
    }
    if (filterDateTo) {
      const endDate = new Date(filterDateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    setTransactions(data || []);
  };

  const handleDeposit = async (method: 'mpesa' | 'paypal') => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
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

  const handleUpdatePaymentMethods = async () => {
    setSavingPayment(true);
    const result = await updatePaymentMethods(mpesaPhone, paypalEmail);
    setSavingPayment(false);
    
    if (result.success) {
      toast.success('Payment methods updated successfully');
    } else {
      toast.error(result.error || 'Failed to update payment methods');
    }
  };

  if (loading || walletLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Wallet Not Found</h3>
        <p className="text-muted-foreground mb-4">We couldn't find your wallet. Creating one now...</p>
        <Button onClick={fetchWallet}>
          <Wallet className="w-4 h-4 mr-2" />
          Create Wallet
        </Button>
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
      <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-2 border-blue-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg">Payment Methods</h3>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-600 mb-1">Connect Your Accounts</p>
              <p className="text-muted-foreground">
                Link your M-Pesa and PayPal accounts to receive deposits and withdrawals. 
                All transactions are secure and encrypted.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4" />
              M-Pesa Phone Number
              {mpesaPhone && <CheckCircle2 className="w-4 h-4 text-green-600" />}
            </label>
            <Input
              type="tel"
              placeholder="+254712345678"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              className="border-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Include country code (e.g., +254 for Kenya)
            </p>
          </div>
          
          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              PayPal Email
              {paypalEmail && <CheckCircle2 className="w-4 h-4 text-green-600" />}
            </label>
            <Input
              type="email"
              placeholder="your.email@paypal.com"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              className="border-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must match your verified PayPal account email
            </p>
          </div>
          
          <Button 
            onClick={handleUpdatePaymentMethods} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={savingPayment || (!mpesaPhone && !paypalEmail)}
          >
            {savingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Payment Methods
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Transaction History</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const csv = generateCSV(transactions);
                downloadCSV(csv, `transactions-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1 block">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="earnings">Earnings</option>
                  <option value="platform_share">Platform Share</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold mb-1 block">Payment Method</label>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Methods</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold mb-1 block">Date Range</label>
                <div className="flex gap-1">
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="text-xs h-9"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="text-xs h-9"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setFilterPaymentMethod('all');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        )}

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

// CSV generation helpers
function generateCSV(transactions: any[]): string {
  const headers = ['Date', 'Type', 'Amount', 'Status', 'Payment Method', 'Description'];
  const rows = transactions.map(tx => [
    new Date(tx.created_at).toLocaleString(),
    tx.type,
    tx.amount,
    tx.status,
    tx.payment_method || 'N/A',
    tx.description || ''
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csv;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
