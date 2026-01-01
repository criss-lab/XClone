import { useState, useEffect, useRef } from 'react';
import { VideoPlayer } from '@/components/features/VideoPlayer';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types';
import { Loader2 } from 'lucide-react';

export default function VideosPage() {
  const [videos, setVideos] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const videoHeight = window.innerHeight;
      const newIndex = Math.round(scrollPosition / videoHeight);
      
      if (newIndex !== activeIndex && newIndex < videos.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeIndex, videos.length]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('is_video', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl font-bold mb-2">No videos yet</p>
          <p className="text-muted-foreground">Be the first to post a video!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-full max-w-full overflow-x-hidden overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollBehavior: 'smooth' }}
    >
      {videos.map((video, index) => (
        <VideoPlayer
          key={video.id}
          post={video}
          isActive={index === activeIndex}
          onUpdate={fetchVideos}
        />
      ))}
    </div>
  );
}
