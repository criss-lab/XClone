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

  const fetchCommunities = async () => {
    try {
      const { data } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (data) {
        // Check which communities user is a member of
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

      // Auto-join as owner
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Discover Communities</h1>
            <p className="text-muted-foreground">Join communities to connect with like-minded people</p>
          </div>
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name (URL)</label>
                    <Input
                      placeholder="technology"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      maxLength={21}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Letters and numbers only, no spaces
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Display Name</label>
                    <Input
                      placeholder="Technology"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                      placeholder="A community for technology enthusiasts..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      maxLength={200}
                    />
                  </div>
                  <Button
                    onClick={handleCreateCommunity}
                    disabled={creating || !formData.name || !formData.display_name}
                    className="w-full"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Community'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Communities List */}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCommunities.map((community) => (
            <div
              key={community.id}
              className="border border-border rounded-xl p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/c/${community.name}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                    {community.icon_url ? (
                      <img src={community.icon_url} alt={community.display_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold">{community.display_name[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{community.display_name}</h3>
                    <p className="text-sm text-muted-foreground">c/{community.name}</p>
                  </div>
                </div>
                {user && (
                  <Button
                    size="sm"
                    variant={community.is_member ? 'outline' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      community.is_member
                        ? handleLeaveCommunity(community.id)
                        : handleJoinCommunity(community.id);
                    }}
                    className="rounded-full"
                  >
                    {community.is_member ? 'Joined' : 'Join'}
                  </Button>
                )}
              </div>
              {community.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{community.description}</p>
              )}
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{formatNumber(community.member_count)} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{formatNumber(community.post_count)} posts</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCommunities.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No communities found</p>
            <p className="text-sm">Try a different search or create your own community</p>
          </div>
        )}
      </div>
    </div>
  );
}
