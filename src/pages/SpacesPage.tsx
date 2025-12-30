import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { Space } from '@/types';
import { Radio, Users, Mic, MicOff, Loader2, Headphones } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import { StartSpaceDialog } from '@/components/features/StartSpaceDialog';
import { JoinSpaceDialog } from '@/components/features/JoinSpaceDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpaceRecordingsPlaylist } from '@/components/features/SpaceRecordingsPlaylist';

export default function SpacesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'recordings'>('live');
  const [allRecordings, setAllRecordings] = useState<any[]>([]);

  useEffect(() => {
    fetchSpaces();
    fetchAllRecordings();
  }, []);

  const fetchSpaces = async () => {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select(`
          *,
          host:user_profiles!spaces_host_id_fkey(*)
        `)
        .eq('is_live', true)
        .order('listener_count', { ascending: false });

      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('space_recordings')
        .select(`
          *,
          user_profiles (*),
          spaces (
            title,
            description,
            host:user_profiles!spaces_host_id_fkey(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAllRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Spaces" />

      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Audio Spaces</h2>
            <p className="text-muted-foreground">Live conversations & recordings</p>
          </div>
          {user && (
            <Button 
              className="rounded-full" 
              size="lg"
              onClick={() => setShowStartDialog(true)}
            >
              <Radio className="w-5 h-5 mr-2" />
              Start Space
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'live' | 'recordings')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="live">
              <Radio className="w-4 h-4 mr-2" />
              Live Now
            </TabsTrigger>
            <TabsTrigger value="recordings">
              <Headphones className="w-4 h-4 mr-2" />
              Recordings
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TabsContent value="live" className="mt-0">
        {spaces.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Radio className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No live Spaces</h3>
            <p className="text-muted-foreground mb-6">
              Check back later for live audio conversations
            </p>
            {user && (
              <Button 
                className="rounded-full" 
                size="lg"
                onClick={() => setShowStartDialog(true)}
              >
                <Radio className="w-5 h-5 mr-2" />
                Be the first to start a Space
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {spaces.map((space) => (
              <div
                key={space.id}
                className="border border-border rounded-2xl p-6 hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="font-semibold text-foreground">LIVE</span>
                    </div>
                    <span>·</span>
                    <Users className="w-4 h-4" />
                    <span>{formatNumber(space.listener_count)} listening</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2">{space.title}</h3>
                {space.description && (
                  <p className="text-muted-foreground mb-4">{space.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                      {space.host?.avatar_url ? (
                        <img
                          src={space.host.avatar_url}
                          alt={space.host.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold">
                          {space.host?.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{space.host?.username}</p>
                      <p className="text-sm text-muted-foreground">Host</p>
                    </div>
                  </div>

                  <Button 
                    className="rounded-full"
                    onClick={() => {
                      setSelectedSpaceId(space.id);
                      setShowJoinDialog(true);
                    }}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </TabsContent>

        <TabsContent value="recordings" className="mt-0">
          {allRecordings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No recordings yet</h3>
              <p className="text-muted-foreground">
                Recorded spaces will appear here for playback
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/5 transition-colors"
                >
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {recording.user_profiles?.avatar_url ? (
                        <img
                          src={recording.user_profiles.avatar_url}
                          alt={recording.user_profiles.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold">
                          {recording.user_profiles?.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{recording.spaces?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        by {recording.user_profiles?.username} • {formatDistanceToNow(new Date(recording.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <audio
                    controls
                    src={recording.audio_url}
                    className="w-full"
                    controlsList="nodownload"
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </div>

      <div className="border-t border-border p-6 mt-8 bg-muted/20">
        <div className="max-w-lg mx-auto text-center">
          <h3 className="font-bold text-lg mb-2">What are Spaces?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Live audio conversations where you can speak, listen and interact with others in real-time.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-background rounded-lg p-4">
              <Radio className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">Host Spaces</p>
              <p className="text-muted-foreground text-xs">Start conversations</p>
            </div>
            <div className="bg-background rounded-lg p-4">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold">Join & Listen</p>
              <p className="text-muted-foreground text-xs">Participate in discussions</p>
            </div>
          </div>
        </div>
      </div>

      <StartSpaceDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        onSuccess={fetchSpaces}
      />

      <JoinSpaceDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        spaceId={selectedSpaceId}
      />
    </div>
  );
}
