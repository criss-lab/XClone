import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  type: 'boost_post' | 'premium' | 'verification';
  metadata?: any;
  onSuccess?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  amount,
  type,
  metadata = {},
  onSuccess
}: PaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'mpesa'>('paypal');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'method' | 'details' | 'pin'>('method');
  
  // PayPal fields
  const [paypalEmail, setPaypalEmail] = useState('');
  
  // M-Pesa fields
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaPin, setMpesaPin] = useState('');

  const handlePaymentMethodSelect = (method: 'paypal' | 'mpesa') => {
    setPaymentMethod(method);
    setStep('details');
  };

  const processPayment = async () => {
    if (!user) return;

    setLoading(true);

    try {
      // Validate inputs
      if (paymentMethod === 'paypal' && !paypalEmail.includes('@')) {
        throw new Error('Please enter a valid PayPal email');
      }

      if (paymentMethod === 'mpesa' && mpesaPhone.length < 10) {
        throw new Error('Please enter a valid M-Pesa phone number');
      }

      if (step === 'details' && paymentMethod === 'mpesa') {
        // For M-Pesa, show PIN entry
        setStep('pin');
        setLoading(false);
        return;
      }

      if (paymentMethod === 'mpesa' && mpesaPin.length !== 4) {
        throw new Error('Please enter your 4-digit M-Pesa PIN');
      }

      // Create payment transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          type,
          amount,
          currency: 'USD',
          payment_method: paymentMethod,
          status: 'pending',
          metadata: {
            ...metadata,
            paypal_email: paymentMethod === 'paypal' ? paypalEmail : null,
            mpesa_phone: paymentMethod === 'mpesa' ? mpesaPhone : null,
          }
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Simulate payment processing
      sonnerToast.loading('Processing payment...');

      // In a real app, this would call PayPal API or M-Pesa API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update transaction status
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          reference_id: `${paymentMethod.toUpperCase()}-${Date.now()}`
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      sonnerToast.dismiss();
      sonnerToast.success('Payment successful!');

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setStep('method');
      setPaypalEmail('');
      setMpesaPhone('');
      setMpesaPin('');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Unable to process payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'method' && 'Select Payment Method'}
            {step === 'details' && paymentMethod === 'paypal' && 'PayPal Payment'}
            {step === 'details' && paymentMethod === 'mpesa' && 'M-Pesa Payment'}
            {step === 'pin' && 'Enter M-Pesa PIN'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'method' && (
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to pay</p>
                <p className="text-3xl font-bold">${amount.toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePaymentMethodSelect('paypal')}
                  className="w-full p-4 border-2 border-border hover:border-primary rounded-lg transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">PayPal</p>
                    <p className="text-sm text-muted-foreground">Pay with PayPal account</p>
                  </div>
                </button>

                <button
                  onClick={() => handlePaymentMethodSelect('mpesa')}
                  className="w-full p-4 border-2 border-border hover:border-primary rounded-lg transition-colors flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">M-Pesa</p>
                    <p className="text-sm text-muted-foreground">Pay with M-Pesa mobile money</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 'details' && paymentMethod === 'paypal' && (
            <div className="space-y-4">
              <div className="bg-blue-600/10 p-4 rounded-lg text-center">
                <p className="text-sm mb-1">Total Amount</p>
                <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paypal-email">PayPal Email</Label>
                <Input
                  id="paypal-email"
                  type="email"
                  placeholder="your@email.com"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address associated with your PayPal account
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('method')}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1"
                  disabled={loading || !paypalEmail}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Pay ${amount.toFixed(2)}
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && paymentMethod === 'mpesa' && (
            <div className="space-y-4">
              <div className="bg-green-600/10 p-4 rounded-lg text-center">
                <p className="text-sm mb-1">Total Amount</p>
                <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                <Input
                  id="mpesa-phone"
                  type="tel"
                  placeholder="254712345678"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your M-Pesa registered phone number
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('method')}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1"
                  disabled={loading || mpesaPhone.length < 10}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'pin' && (
            <div className="space-y-4">
              <div className="bg-green-600/10 p-4 rounded-lg text-center">
                <p className="text-sm mb-1">Amount to pay</p>
                <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">to {mpesaPhone}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesa-pin">Enter M-Pesa PIN</Label>
                <Input
                  id="mpesa-pin"
                  type="password"
                  placeholder="****"
                  value={mpesaPin}
                  onChange={(e) => setMpesaPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your 4-digit M-Pesa PIN to complete the payment
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStep('details')}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={processPayment}
                  className="flex-1"
                  disabled={loading || mpesaPin.length !== 4}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
