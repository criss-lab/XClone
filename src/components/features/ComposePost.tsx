import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Video, Loader2, X, BarChart3, Smile, Calendar, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreatePollDialog } from './CreatePollDialog';
import { SchedulePostDialog } from './SchedulePostDialog';
import { ProductTagDialog } from './ProductTagDialog';
import { toast as sonnerToast } from 'sonner';

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
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollData, setPollData] = useState<any>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [taggedProducts, setTaggedProducts] = useState<any[]>([]);
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
      setGifUrl(null);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      
      // Check file type
      if (!file.type.startsWith('video/')) {
        sonnerToast.error('Please select a valid video file');
        return;
      }
      
      // Check file size (50MB for premium, 10MB for free)
      const maxSize = user?.creator_tier !== 'free' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        sonnerToast.error(`Video must be less than ${sizeMB}MB. ${user?.creator_tier === 'free' ? 'Upgrade to Premium for larger uploads!' : ''}`);
        return;
      }
      
      // Preview video before setting
      const videoUrl = URL.createObjectURL(file);
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      
      videoElement.onloadedmetadata = () => {
        // Check video duration (max 10 minutes for free users)
        const maxDuration = user?.creator_tier !== 'free' ? 3600 : 600; // 1 hour for premium, 10 min for free
        if (videoElement.duration > maxDuration) {
          const maxMin = Math.floor(maxDuration / 60);
          sonnerToast.error(`Video duration cannot exceed ${maxMin} minutes`);
          URL.revokeObjectURL(videoUrl);
          return;
        }
        
        setVideo(file);
        setImage(null);
        setGifUrl(null);
        sonnerToast.success('Video ready to upload!');
      };
      
      videoElement.onerror = () => {
        sonnerToast.error('Failed to load video. Please try a different file.');
        URL.revokeObjectURL(videoUrl);
      };
    }
  };

  const handlePollCreated = (data: { question: string; options: string[]; duration: number }) => {
    setPollData(data);
    setShowPollDialog(false);
    sonnerToast.success('Poll attached');
  };

  const handleSchedule = (date: Date) => {
    setScheduledDate(date);
    setShowScheduleDialog(false);
    sonnerToast.success('Post scheduled');
  };

  const handleProductsSelected = (products: any[]) => {
    setTaggedProducts(products);
    sonnerToast.success(`${products.length} product(s) tagged`);
  };

  const handlePost = async () => {
    if (!content.trim() && !image && !video && !gifUrl && !pollData) return;

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
        sonnerToast.loading('Uploading video...');
        
        const fileExt = video.name.split('.').pop();
        const fileName = `videos/${user.id}/${Date.now()}.${fileExt}`;
        
        // Upload with progress tracking
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, video, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Video upload error:', uploadError);
          sonnerToast.error(`Upload failed: ${uploadError.message}`);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
        isVideo = true;
        sonnerToast.dismiss();
        sonnerToast.success('Video uploaded successfully!');
      }

      // If scheduled, create scheduled_post instead
      if (scheduledDate) {
        const { error: scheduleError } = await supabase.from('scheduled_posts').insert({
          user_id: user.id,
          content: content.trim(),
          image_url: imageUrl || gifUrl,
          video_url: videoUrl,
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending'
        });

        if (scheduleError) throw scheduleError;

        setContent('');
        setImage(null);
        setVideo(null);
        setPollData(null);
        setGifUrl(null);
        setScheduledDate(null);
        setTaggedProducts([]);
        toast({ title: 'Success', description: 'Post scheduled successfully' });
        onSuccess?.();
        setLoading(false);
        return;
      }

      const { data: postData, error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl || gifUrl,
        video_url: videoUrl,
        is_video: isVideo,
        community_id: communityId || null
      }).select().single();

      if (error) throw error;

      // Create poll if attached
      if (pollData && postData) {
        const expiresAt = new Date(Date.now() + pollData.duration * 60 * 1000);
        
        const { data: poll, error: pollError } = await supabase
          .from('polls')
          .insert({
            post_id: postData.id,
            question: pollData.question,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (pollError) throw pollError;

        // Create poll options
        const optionsData = pollData.options.map((opt: string) => ({
          poll_id: poll.id,
          option_text: opt
        }));

        const { error: optionsError } = await supabase
          .from('poll_options')
          .insert(optionsData);

        if (optionsError) throw optionsError;
      }

      // Tag products
      if (taggedProducts.length > 0 && postData) {
        const productTags = taggedProducts.map(product => ({
          post_id: postData.id,
          product_id: product.id
        }));

        const { error: tagError } = await supabase
          .from('product_tags')
          .insert(productTags);

        if (tagError) console.error('Error tagging products:', tagError);
      }

      setContent('');
      setImage(null);
      setVideo(null);
      setPollData(null);
      setGifUrl(null);
      setScheduledDate(null);
      setTaggedProducts([]);
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
        <div className="flex-1 overflow-hidden">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-0 resize-none focus-visible:ring-0 p-0 text-lg bg-transparent w-full"
            maxLength={700}
          />
          {image && (
            <div className="mt-2 relative rounded-2xl overflow-hidden max-w-full">
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
            <div className="mt-2 relative rounded-2xl overflow-hidden max-w-full">
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
          {pollData && (
            <div className="mt-2 p-3 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="w-4 h-4" />
                  Poll attached
                </div>
                <button
                  onClick={() => setPollData(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-muted-foreground break-words">{pollData.question}</p>
            </div>
          )}
          {scheduledDate && (
            <div className="mt-2 p-3 border border-border rounded-lg bg-primary/5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  Scheduled
                </div>
                <button
                  onClick={() => setScheduledDate(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {scheduledDate.toLocaleString()}
              </p>
            </div>
          )}
          {taggedProducts.length > 0 && (
            <div className="mt-2 p-3 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingBag className="w-4 h-4" />
                  {taggedProducts.length} product{taggedProducts.length !== 1 ? 's' : ''} tagged
                </div>
                <button
                  onClick={() => setTaggedProducts([])}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {taggedProducts.map(product => (
                  <div key={product.id} className="px-2 py-1 bg-muted rounded text-xs truncate">
                    {product.name} - ${product.price}
                  </div>
                ))}
              </div>
            </div>
          )}
          {gifUrl && (
            <div className="mt-2 relative rounded-2xl overflow-hidden max-w-full">
              <img src={gifUrl} alt="GIF" className="max-h-96 w-full object-cover" />
              <button
                onClick={() => setGifUrl(null)}
                className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border overflow-x-auto">
            <div className="flex space-x-2">
              <label className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors flex-shrink-0">
                <Image className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={loading || !!video || !!gifUrl}
                />
              </label>
              <label className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors flex-shrink-0">
                <Video className="w-5 h-5" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoChange}
                  disabled={loading || !!image || !!gifUrl}
                />
              </label>
              <button
                onClick={() => setShowGifPicker(!showGifPicker)}
                disabled={loading || !!image || !!video}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPollDialog(true)}
                disabled={loading || !!pollData}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
                title="Add poll"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowScheduleDialog(true)}
                disabled={loading || !!scheduledDate}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
                title="Schedule post"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowProductDialog(true)}
                disabled={loading}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
                title="Tag products"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              {content.length > 0 && (
                <span className={`text-sm ${content.length > 680 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {content.length}/700
                </span>
              )}
              <Button
                onClick={handlePost}
                disabled={loading || (!content.trim() && !image && !video && !gifUrl && !pollData) || content.length > 700}
                className="rounded-full px-6 font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
          {showGifPicker && (
            <div className="mt-2 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-3">Search for GIFs on Giphy.com or Tenor.com and paste the URL below:</p>
              <input
                type="url"
                placeholder="Paste GIF URL"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const url = (e.target as HTMLInputElement).value;
                    if (url) {
                      setGifUrl(url);
                      setShowGifPicker(false);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
      {showPollDialog && (
        <CreatePollDialog
          onClose={() => setShowPollDialog(false)}
          onPollCreated={handlePollCreated}
        />
      )}
      {showScheduleDialog && (
        <SchedulePostDialog
          onClose={() => setShowScheduleDialog(false)}
          onSchedule={handleSchedule}
        />
      )}
      {showProductDialog && (
        <ProductTagDialog
          onClose={() => setShowProductDialog(false)}
          onProductSelected={handleProductsSelected}
        />
      )}
    </div>
  );
}
