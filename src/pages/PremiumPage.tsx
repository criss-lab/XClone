import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { TopBar } from '@/components/layout/TopBar';
import { 
  Crown,
  Check,
  Zap,
  Shield,
  Eye,
  Users,
  BarChart3,
  MessageCircle,
  Sparkles,
  Video,
  Clock,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

const PREMIUM_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    color: 'from-blue-500 to-cyan-500',
    icon: Zap,
    features: [
      'Verified badge',
      'Edit posts',
      'Longer posts (1000 chars)',
      'Priority support',
      'Remove ads',
      'Custom theme colors'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    color: 'from-purple-500 to-pink-500',
    icon: Crown,
    popular: true,
    features: [
      'Everything in Basic',
      'Advanced analytics',
      'Schedule unlimited posts',
      'Video uploads up to 50MB',
      'Creator monetization',
      'Subscriber-only content',
      'Priority in feeds',
      'Blue verified badge'
    ]
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 19.99,
    color: 'from-amber-500 to-orange-500',
    icon: Star,
    features: [
      'Everything in Premium',
      'Gold verified badge',
      'Unlimited video uploads (100MB)',
      'White-label communities',
      'Advanced moderation tools',
      'API access',
      'Dedicated account manager',
      'Early access to features'
    ]
  }
];

export default function PremiumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserTier();
  }, [user]);

  const fetchUserTier = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('creator_tier')
        .eq('id', user.id)
        .single();

      setCurrentTier(data?.creator_tier || 'free');
    } catch (error) {
      console.error('Error fetching user tier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (tierId: string, price: number) => {
    if (!user) return;

    // In production, this would integrate with Stripe/payment processor
    // For now, we'll simulate the subscription
    
    const confirmed = confirm(
      `Subscribe to ${tierId.toUpperCase()} plan for $${price}/month?\n\n` +
      `Note: This is a demo. In production, this would connect to a payment processor.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          creator_tier: tierId,
          is_creator: true,
          can_monetize: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Successfully subscribed to ${tierId.toUpperCase()} plan!`);
      setCurrentTier(tierId);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopBar title="Premium Plans" showBack />

      <div className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Hero Section */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Unlock Premium Features
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get verified, unlock advanced features, and grow your presence with Premium
          </p>
          {currentTier !== 'free' && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 border border-green-600 rounded-full">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Current Plan: {currentTier.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PREMIUM_TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.id;
            
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border-2 transition-all ${
                  tier.popular
                    ? 'border-purple-500 shadow-xl shadow-purple-500/20 scale-105'
                    : 'border-border hover:border-primary/50'
                } ${isCurrentTier ? 'bg-primary/5' : 'bg-background'}`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                
                <div className="p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${tier.color} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-bold">${tier.price}</span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(tier.id, tier.price)}
                    disabled={isCurrentTier}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      isCurrentTier
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : tier.popular
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    }`}
                  >
                    {isCurrentTier ? 'Current Plan' : 'Subscribe Now'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="bg-muted/30 rounded-2xl p-6 mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Compare Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Shield}
              title="Verified Badge"
              description="Get the coveted checkmark and stand out"
              tier="Basic+"
            />
            <FeatureCard
              icon={BarChart3}
              title="Advanced Analytics"
              description="Deep insights into your audience"
              tier="Premium+"
            />
            <FeatureCard
              icon={Video}
              title="HD Video Uploads"
              description="Upload videos up to 100MB"
              tier="VIP"
            />
            <FeatureCard
              icon={Clock}
              title="Schedule Posts"
              description="Plan your content in advance"
              tier="Premium+"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Priority Support"
              description="Get help when you need it"
              tier="Basic+"
            />
            <FeatureCard
              icon={Eye}
              title="Remove Ads"
              description="Ad-free browsing experience"
              tier="Basic+"
            />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <FAQItem
              question="Can I cancel anytime?"
              answer="Yes! You can cancel your subscription at any time. You'll keep your premium features until the end of your billing period."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards, debit cards, and PayPal. In production, this would integrate with Stripe for secure payments."
            />
            <FAQItem
              question="Will I lose my verification if I downgrade?"
              answer="Your verification badge will remain for 30 days after downgrading, giving you time to renew your subscription."
            />
            <FAQItem
              question="Can I upgrade or downgrade my plan?"
              answer="Absolutely! You can change your plan at any time. If you upgrade, you'll be charged the prorated difference immediately."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, tier }: any) {
  return (
    <div className="bg-background rounded-xl p-4 border border-border">
      <Icon className="w-8 h-8 text-primary mb-2" />
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>
      <span className="text-xs font-medium text-primary">{tier}</span>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-muted/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold">{question}</span>
        <span className="text-2xl">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}
