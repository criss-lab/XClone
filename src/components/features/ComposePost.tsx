import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComposePostProps {
  onSuccess?: () => void;
  communityId?: string;
}

export function ComposePost({ onSuccess, communityId }: ComposePostProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="border-b border-border p-8 text-center">
        <p className="text-muted-foreground mb-4">Sign in to post</p>
        <Button onClick={() => navigate('/auth')} className="rounded-full px-6">
          Sign in
        </Button>
      </div>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImage(file);
      setVideo(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Video must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setVideo(file);
      setImage(null);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !image && !video) return;

    setLoading(true);

    try {
      let imageUrl = null;
      let videoUrl = null;
      let isVideo = false;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, image, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      if (video) {
        const fileExt = video.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, video, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
        isVideo = true;
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
        video_url: videoUrl,
        is_video: isVideo,
        community_id: communityId || null,
      });

      if (error) throw error;

      setContent('');
      setImage(null);
      setVideo(null);
      toast({ title: 'Success', description: 'Post created successfully' });
      onSuccess?.();
    } catch (error: any) {
      console.error('Post error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-border p-4">
      <div className="flex space-x-3">
        <div 
          className="w-10 h-10 rounded-full bg-muted flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => navigate(`/profile/${user.username}`)}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold">
              {user.username[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-0 resize-none focus-visible:ring-0 p-0 text-lg bg-transparent"
            maxLength={280}
          />
          {image && (
            <div className="mt-2 relative rounded-2xl overflow-hidden">
              <img
                src={URL.createObjectURL(image)}
                alt="Upload preview"
                className="max-h-96 w-full object-cover"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {video && (
            <div className="mt-2 relative rounded-2xl overflow-hidden">
              <video
                src={URL.createObjectURL(video)}
                controls
                className="max-h-96 w-full"
              />
              <button
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex space-x-2">
              <label className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors">
                <Image className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading || !!video}
                />
              </label>
              <label className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors">
                <Video className="w-5 h-5" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoChange}
                  disabled={loading || !!image}
                />
              </label>
            </div>
            <div className="flex items-center space-x-3">
              {content.length > 0 && (
                <span className={`text-sm ${content.length > 260 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {content.length}/280
                </span>
              )}
              <Button
                onClick={handlePost}
                disabled={loading || (!content.trim() && !image && !video) || content.length > 280}
                className="rounded-full px-6 font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
