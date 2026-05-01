import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Users, Plus, TrendingUp, Loader2, Search, Lock, Globe, Shield, Crown
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

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
  is_private: boolean;
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
  const [activeTab, setActiveTab] = useState<'all' | 'joined' | 'discover'>('all');
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    is_private: false,
  });

  useEffect(() => {
    fetchCommunities();
  }, [user, activeTab]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    AdMob.showBanner({
      adId: 'ca-app-pub-7234579833875016/8657343194',
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
    });
    return () => { AdMob.hideBanner(); };
  }, []);

  const fetchCommunities = async () => {
    try {
      let query = supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      const { data } = await query;
      if (!data) return;

      if (user) {
        const { data: memberships } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', user.id);

        const memberIds = new Set(memberships?.map((m) => m.community_id));

        let enriched = data.map((c) => ({ ...c, is_member: memberIds.has(c.id) }));

        if (activeTab === 'joined') {
          enriched = enriched.filter(c => c.is_member);
        } else if (activeTab === 'discover') {
          enriched = enriched.filter(c => !c.is_member);
        }

        setCommunities(enriched);
      } else {
        setCommunities(data.map(c => ({ ...c, is_member: false })));
      }
    } catch (error) {
      console.error('fetchCommunities error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async () => {
    if (!user) { navigate('/auth'); return; }

    if (!formData.name.trim() || !formData.display_name.trim()) {
      toast({ title: 'Error', description: 'Name and display name are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const communityName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!communityName) {
        toast({ title: 'Error', description: 'Community name must contain letters or numbers', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: communityName,
          display_name: formData.display_name,
          description: formData.description,
          is_private: formData.is_private,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as owner
      await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: user.id,
        role: 'owner',
      });

      toast({ title: '🎉 Community created!' });
      setCreateOpen(false);
      setFormData({ name: '', display_name: '', description: '', is_private: false });
      fetchCommunities();
      navigate(`/c/${communityName}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create community', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (communityId: string) => {
    if (!user) { navigate('/auth'); return; }
    try {
      await supabase.from('community_members').insert({ community_id: communityId, user_id: user.id });
      toast({ title: '✅ Joined community!' });
      fetchCommunities();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLeave = async (communityId: string) => {
    if (!user) return;
    try {
      await supabase.from('community_members')
        .delete()
        .match({ community_id: communityId, user_id: user.id });
      toast({ title: 'Left community' });
      fetchCommunities();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filtered = communities.filter(c =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Communities" />

      {/* Hero */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold">Communities</h2>
            <p className="text-muted-foreground text-sm">Join conversations that matter to you</p>
          </div>
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create a Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium block mb-1">Community Name (URL)</label>
                    <Input
                      placeholder="technology"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                    />
                    {formData.name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        URL: /c/{formData.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Display Name</label>
                    <Input
                      placeholder="Technology Enthusiasts"
                      value={formData.display_name}
                      onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Description</label>
                    <Textarea
                      placeholder="What is this community about?"
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => setFormData(p => ({ ...p, is_private: !p.is_private }))}>
                    {formData.is_private ? (
                      <Lock className="w-5 h-5 text-orange-500" />
                    ) : (
                      <Globe className="w-5 h-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{formData.is_private ? 'Private' : 'Public'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.is_private
                          ? 'Only members can see content'
                          : 'Anyone can join and see posts'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateCommunity}
                    disabled={creating}
                    className="w-full rounded-full"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Community
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-background"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      {user && (
        <div className="sticky top-14 z-20 bg-background border-b border-border">
          <div className="flex">
            {(['all', 'joined', 'discover'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 capitalize ${
                  activeTab === tab
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Communities List */}
      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No communities found</p>
            <p className="text-sm mt-1">
              {activeTab === 'joined' ? "You haven't joined any communities yet" : 'Try a different search'}
            </p>
          </div>
        ) : (
          filtered.map(community => (
            <div
              key={community.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => navigate(`/c/${community.name}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {community.icon_url ? (
                      <img src={community.icon_url} alt={community.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-primary">{community.display_name[0]}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground truncate">{community.display_name}</h3>
                      {community.is_private ? (
                        <span className="flex items-center gap-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      )}
                      {community.is_member && (
                        <span className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          <Shield className="w-3 h-3" /> Member
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">c/{community.name}</p>
                    {community.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{community.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatNumber(community.member_count)} members
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {formatNumber(community.post_count)} posts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Join/Leave button */}
                {user && (
                  <Button
                    size="sm"
                    variant={community.is_member ? 'outline' : 'default'}
                    className="rounded-full flex-shrink-0"
                    onClick={e => {
                      e.stopPropagation();
                      community.is_member
                        ? handleLeave(community.id)
                        : handleJoin(community.id);
                    }}
                  >
                    {community.is_member ? 'Joined' : 'Join'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
