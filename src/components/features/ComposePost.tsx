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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaTypes, setMediaTypes] = useState<('image' | 'video')[]>([]);
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

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check if mixing images and videos
    const hasVideo = mediaTypes.includes('video');
    const hasImage = mediaTypes.includes('image');
    const isVideo = type === 'video';

    if ((hasVideo && !isVideo) || (hasImage && isVideo)) {
      sonnerToast.error('You can only upload images OR videos, not both');
      return;
    }

    // Limit: videos to 1, images to 4
    const maxFiles = isVideo ? 1 : 4;
    const validFiles = files.slice(0, maxFiles - mediaFiles.length);

    // Check file sizes (20MB limit)
    const oversizedFiles = validFiles.filter((file) => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      sonnerToast.error('Maximum file size is 20MB');
      return;
    }

    // Validate file types
    const invalidFiles = validFiles.filter((file) => {
      if (isVideo) {
        return !file.type.startsWith('video/');
      } else {
        return !file.type.startsWith('image/');
      }
    });

    if (invalidFiles.length > 0) {
      sonnerToast.error(`Invalid file type. Please select ${isVideo ? 'video' : 'image'} files only.`);
      return;
    }

    const newTypes = validFiles.map(() => type);

    setMediaFiles((prev) => [...prev, ...validFiles]);
    setMediaTypes((prev) => [...prev, ...newTypes]);
    setGifUrl(null);
    sonnerToast.success(`${validFiles.length} ${type}(s) added`);
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaTypes((prev) => prev.filter((_, i) => i !== index));
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
    if (!content.trim() && mediaFiles.length === 0 && !gifUrl && !pollData) return;

    setLoading(true);

    try {
      let mediaUrls: string[] = [];
      let videoUrl = null;
      let isVideo = false;

      // Upload media files
      if (mediaFiles.length > 0) {
        sonnerToast.loading(`Uploading ${mediaFiles.length} file(s)...`);
        
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          const fileExt = file.name.split('.').pop();
          const isVideoFile = mediaTypes[i] === 'video';
          const folder = isVideoFile ? 'videos' : '';
          const fileName = `${folder}${user.id}/${Date.now()}_${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            sonnerToast.error(`Failed to upload file ${i + 1}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

          if (isVideoFile) {
            videoUrl = publicUrl;
            isVideo = true;
          } else {
            mediaUrls.push(publicUrl);
          }
        }
        
        sonnerToast.dismiss();
        sonnerToast.success('Upload complete!');
      }

      // If scheduled, create scheduled_post instead
      if (scheduledDate) {
        const { error: scheduleError } = await supabase.from('scheduled_posts').insert({
          user_id: user.id,
          content: content.trim(),
          image_url: mediaUrls.length > 0 ? mediaUrls[0] : (gifUrl || null),
          video_url: videoUrl,
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending'
        });

        if (scheduleError) throw scheduleError;

        setContent('');
        setMediaFiles([]);
        setMediaTypes([]);
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
        image_url: mediaUrls.length > 0 ? mediaUrls[0] : (gifUrl || null), // Legacy single image field
        media_urls: mediaUrls.length > 0 ? mediaUrls : [],
        media_count: mediaUrls.length,
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
      setMediaFiles([]);
      setMediaTypes([]);
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

  const hasVideo = mediaTypes.includes('video');
  const hasImage = mediaTypes.includes('image');

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
          
          {/* Media Grid */}
          {mediaFiles.length > 0 && (
            <div className={`mt-2 gap-2 ${
              mediaFiles.length === 1 ? 'grid grid-cols-1' :
              mediaFiles.length === 2 ? 'grid grid-cols-2' :
              mediaFiles.length === 3 ? 'grid grid-cols-2' :
              'grid grid-cols-2'
            }`}>
              {mediaFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`relative rounded-2xl overflow-hidden ${
                    mediaFiles.length === 3 && index === 0 ? 'col-span-2' : ''
                  }`}
                >
                  {mediaTypes[index] === 'video' ? (
                    <video
                      src={URL.createObjectURL(file)}
                      controls
                      autoPlay
                      muted
                      className="w-full h-full object-cover max-h-96"
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover max-h-96"
                    />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
              <label className={`cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors flex-shrink-0 ${(loading || hasVideo || !!gifUrl || hasImage && mediaFiles.length >= 4) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Image className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleMediaChange(e, 'image')}
                  disabled={loading || hasVideo || !!gifUrl || (hasImage && mediaFiles.length >= 4)}
                />
              </label>
              <label className={`cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors flex-shrink-0 ${(loading || hasImage || !!gifUrl || hasVideo) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Video className="w-5 h-5" />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleMediaChange(e, 'video')}
                  disabled={loading || hasImage || !!gifUrl || hasVideo}
                />
              </label>
              <button
                onClick={() => setShowGifPicker(!showGifPicker)}
                disabled={loading || mediaFiles.length > 0}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowPollDialog(true)}
                disabled={loading || !!pollData}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowScheduleDialog(true)}
                disabled={loading || !!scheduledDate}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowProductDialog(true)}
                disabled={loading}
                className="cursor-pointer p-2 hover:bg-primary/10 rounded-full text-primary transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              {hasImage && (
                <span className="text-sm text-muted-foreground">
                  {mediaFiles.length}/4 images
                </span>
              )}
              {content.length > 0 && (
                <span className={`text-sm ${content.length > 680 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {content.length}/700
                </span>
              )}
              <Button
                onClick={handlePost}
                disabled={loading || (!content.trim() && mediaFiles.length === 0 && !gifUrl && !pollData) || content.length > 700}
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
