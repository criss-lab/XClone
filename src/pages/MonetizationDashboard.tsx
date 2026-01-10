import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, TrendingUp, Users, Eye, AlertCircle, CheckCircle, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatNumber } from '@/lib/utils';

interface EligibilityResult {
  eligible: boolean;
  followers_count: number;
  total_views: number;
  engagement_rate: number;
  reason: string;
}

export function MonetizationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [monetizationData, setMonetizationData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch monetization data
      const { data: monData } = await supabase
        .from('user_monetization')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setMonetizationData(monData);

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setEarnings(earningsData || []);
    } catch (error) {
      console.error('Error fetching monetization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!user) return;

    setChecking(true);

    try {
      const { data, error } = await supabase.rpc('check_monetization_eligibility', {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setEligibility(data[0]);
        
        if (data[0].eligible) {
          toast({
            title: 'Congratulations! 🎉',
            description: 'You are eligible for monetization',
          });
        } else {
          toast({
            title: 'Not Eligible Yet',
            description: data[0].reason,
            variant: 'destructive',
          });
        }
      }

      fetchData();
    } catch (error: any) {
      console.error('Error checking eligibility:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const enableMonetization = async () => {
    if (!user || !eligibility?.eligible) return;

    try {
      const { error } = await supabase
        .from('user_monetization')
        .upsert({
          user_id: user.id,
          is_monetized: true,
          eligibility_status: 'eligible',
        });

      if (error) throw error;

      toast({
        title: 'Monetization Enabled',
        description: 'You can now earn from your content',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const pendingEarnings = earnings
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Monetization" showBack />

      {/* Eligibility Status */}
      <div className="p-6 border-b border-border">
        {monetizationData?.is_monetized ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-600 dark:text-green-400">Monetization Active</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're earning from your content. Keep creating quality posts!
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Crown className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold">Monetization Requirements</p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>✓ Minimum 1,000 followers</li>
                    <li>✓ Minimum 10,000 total post views</li>
                    <li>✓ Minimum 2% average engagement rate</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={checkEligibility}
              disabled={checking}
              className="w-full"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Check My Eligibility
                </>
              )}
            </Button>

            {eligibility && (
              <div className={`mt-4 p-4 rounded-lg border ${
                eligibility.eligible
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-destructive/10 border-destructive/20'
              }`}>
                <p className="font-semibold mb-2">
                  {eligibility.eligible ? '✅ Eligible!' : '❌ Not Eligible'}
                </p>
                <div className="text-sm space-y-1">
                  <p>Followers: {formatNumber(eligibility.followers_count)} / 1,000</p>
                  <p>Total Views: {formatNumber(eligibility.total_views)} / 10,000</p>
                  <p>Avg Engagement: {eligibility.engagement_rate.toFixed(2)}% / 2%</p>
                  <p className="mt-2 text-muted-foreground">{eligibility.reason}</p>
                </div>
                {eligibility.eligible && (
                  <Button onClick={enableMonetization} className="w-full mt-4">
                    Enable Monetization
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Earnings Overview */}
      {monetizationData?.is_monetized && (
        <>
          <div className="p-6 border-b border-border">
            <h3 className="font-bold text-lg mb-4">Earnings Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Total Earned</span>
                </div>
                <p className="text-2xl font-bold">${totalEarnings.toFixed(2)}</p>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Pending</span>
                </div>
                <p className="text-2xl font-bold">${pendingEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Recent Earnings */}
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">Recent Earnings</h3>
            {earnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No earnings yet</p>
                <p className="text-sm mt-1">Keep creating great content!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earnings.map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-semibold capitalize">{earning.source}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(earning.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${parseFloat(earning.amount).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        earning.status === 'paid'
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-yellow-500/20 text-yellow-600'
                      }`}>
                        {earning.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
