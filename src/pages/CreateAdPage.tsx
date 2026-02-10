import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, Image as ImageIcon, Video, Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAdPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [budget, setBudget] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'mpesa' | 'paypal'>('wallet');

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !budget || parseFloat(budget) < 10) {
      toast.error('Please fill all fields. Minimum budget is $10.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `ads/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Check wallet balance if paying with wallet
      if (paymentMethod === 'wallet') {
        const { data: wallet } = await supabase
          .from('user_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!wallet || wallet.balance < parseFloat(budget)) {
          toast.error('Insufficient wallet balance');
          setLoading(false);
          return;
        }
      }

      // Create ad
      const { data: adData, error: adError } = await supabase
        .from('user_ads')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl,
          target_url: targetUrl.trim() || null,
          budget: parseFloat(budget),
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'wallet' ? 'paid' : 'pending',
          status: 'pending'
        })
        .select()
        .single();

      if (adError) throw adError;

      // If paying with wallet, deduct amount
      if (paymentMethod === 'wallet') {
        const { error: txError } = await supabase.rpc('deduct_from_wallet', {
          user_id_param: user.id,
          amount_param: parseFloat(budget),
          description_param: `Payment for ad: ${title}`
        });

        if (txError) {
          // Rollback ad creation if payment fails
          await supabase.from('user_ads').delete().eq('id', adData.id);
          throw new Error('Payment failed');
        }

        // Auto-verify if paid via wallet
        const { data: verificationResult } = await supabase.rpc('auto_verify_ad', {
          ad_id_param: adData.id
        });

        if (verificationResult?.auto_approved) {
          toast.success('Ad created and auto-approved! It will start running soon.');
        } else {
          toast.success('Ad created! Admin will review it shortly.');
        }
      } else {
        toast.success('Ad created! Please complete payment. Admin will verify and activate your ad.');
      }

      navigate('/my-ads');
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(error.message || 'Failed to create ad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Create Advertisement" showBack />

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-primary/20 rounded-full">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Promote Your Content</h2>
              <p className="text-sm text-muted-foreground">Reach thousands of users instantly</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Ad Title *</label>
            <Input
              placeholder="Enter a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description *</label>
            <Textarea
              placeholder="Describe what you're promoting..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Target URL (Optional)</label>
            <Input
              type="url"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Ad Image</label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imagePreview} alt="Ad preview" className="w-full max-h-64 object-cover" />
                <button
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Budget (USD) *</label>
            <Input
              type="number"
              placeholder="Minimum $10"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="10"
              step="1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your ad will run until budget is spent (estimated {budget ? Math.floor(parseFloat(budget) * 1000) : 0} impressions)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Payment Method</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Wallet className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Wallet</p>
              </button>
              <button
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  paymentMethod === 'mpesa'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <p className="text-xl font-bold mb-2">M</p>
                <p className="text-sm font-medium">M-Pesa</p>
              </button>
              <button
                onClick={() => setPaymentMethod('paypal')}
                className={`p-4 border-2 rounded-xl transition-all ${
                  paymentMethod === 'paypal'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <p className="text-xl font-bold mb-2">P</p>
                <p className="text-sm font-medium">PayPal</p>
              </button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <h4 className="font-semibold mb-2">What happens next?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ {paymentMethod === 'wallet' ? 'Payment processed instantly' : 'Complete payment via selected method'}</li>
              <li>✓ AI reviews your ad automatically</li>
              <li>✓ Admin verifies (usually within 1 hour)</li>
              <li>✓ Ad goes live and reaches users</li>
              <li>✓ Track performance in real-time</li>
            </ul>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !title || !description || !budget || parseFloat(budget) < 10}
            className="w-full py-6 text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {paymentMethod === 'wallet' ? 'Pay & Launch Ad' : 'Create Ad'}
          </Button>
        </div>
      </div>
    </div>
  );
}
