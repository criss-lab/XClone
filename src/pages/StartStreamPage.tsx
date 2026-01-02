import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Loader2, Video, Users, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function StartStreamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          is_live: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Stream started!');
      navigate(`/stream/${data.id}`);
    } catch (error: any) {
      console.error('Error starting stream:', error);
      toast.error(error.message || 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sign in to start streaming</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopBar title="Start Live Stream" showBack />

      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-500 rounded-full">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Go Live</h2>
              <p className="text-sm text-muted-foreground">Stream to your followers in real-time</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleStartStream} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Stream Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your stream about?"
              required
              maxLength={100}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell viewers what to expect..."
              rows={4}
              maxLength={500}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background"
              disabled={loading}
            >
              <option value="general">General</option>
              <option value="gaming">Gaming</option>
              <option value="music">Music</option>
              <option value="sports">Sports</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
              <option value="tech">Technology</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="news">News & Politics</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📱 Streaming Tips
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Use a stable internet connection</li>
              <li>• Enable notifications so followers know you're live</li>
              <li>• Engage with your viewers in the chat</li>
              <li>• Keep your stream title clear and descriptive</li>
              <li>• Streams are automatically recorded for 24 hours</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !title.trim()}
              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Go Live
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <Users className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Unlimited Viewers</h3>
            <p className="text-sm text-muted-foreground">
              Stream to thousands of viewers simultaneously
            </p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg">
            <Video className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">HD Quality</h3>
            <p className="text-sm text-muted-foreground">
              Broadcast in high definition up to 1080p
            </p>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg">
            <Radio className="w-8 h-8 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Auto Recording</h3>
            <p className="text-sm text-muted-foreground">
              Streams saved for 24 hours automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
