import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, TrendingUp, Loader2, Search } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

interface Community {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  member_count: number;
  post_count: number;
  created_by: string;
  is_member?: boolean;
}

export default function CommunitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
  });

  useEffect(() => {
    fetchCommunities();
  }, [user]);

  useEffect(() => {
    // Show banner at bottom
    AdMob.showBanner({
      adId: "ca-app-pub-7234579833875016/8657343194", // Feed Top / Banner ID
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
    });

    return () => {
      AdMob.hideBanner();
    };
  }, []);

  const fetchCommunities = async () => {
    try {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (data) {
        if (user) {
          const { data: memberships } = await supabase
            .from('community_members')
            .select('community_id')
            .eq('user_id', user.id);

          const memberIds = new Set(memberships?.map((m) => m.community_id));

          setCommunities(
            data.map((c) => ({
              ...c,
              is_member: memberIds.has(c.id),
            }))
          );
        } else {
          setCommunities(data);
        }
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!formData.name || !formData.display_name) {
      toast({
        title: 'Error',
        description: 'Name and display name are required',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const communityName = formData.name.toLowerCase().replace(/\s+/g, '');

      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: communityName,
          display_name: formData.display_name,
          description: formData.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: user.id,
        role: 'owner',
      });

      toast({ title: 'Community created successfully!' });
      setCreateOpen(false);
      setFormData({ name: '', display_name: '', description: '' });
      fetchCommunities();
      navigate(`/c/${communityName}`);
    } catch (error: any) {
      console.error('Create community error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create community',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({ title: 'Joined community!' });
      fetchCommunities();
    } catch (error: any) {
      console.error('Join error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join community',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .match({ community_id: communityId, user_id: user.id });

      if (error) throw error;

      toast({ title: 'Left community' });
      fetchCommunities();
    } catch (error: any) {
      console.error('Leave error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave community',
        variant: 'destructive',
      });
    }
  };

  const filteredCommunities = communities.filter((c) =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Communities" />

      <div className="p-4 space-y-4">
        {/* ...Rest of the Communities UI (unchanged) */}
      </div>
    </div>
  );
}
