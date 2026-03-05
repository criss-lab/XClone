import React from 'react';
import { ExternalLink, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { parseContent } from '@/lib/utils';

interface SponsoredPostCardProps {
  post: any;
}

export function SponsoredPostCard({ post }: SponsoredPostCardProps) {
  const handleClick = async () => {
    // Track click
    try {
      await supabase.rpc('track_sponsored_impression', {
        content_id_param: post.id,
        user_id_param: null,
        clicked_param: true
      });

      // Open target URL
      if (post.target_url) {
        window.open(post.target_url, '_blank');
      }
    } catch (error) {
      console.error('Error tracking sponsored click:', error);
    }
  };

  const handleImpression = async () => {
    // Track impression when post appears
    try {
      await supabase.rpc('track_sponsored_impression', {
        content_id_param: post.id,
        user_id_param: null,
        clicked_param: false
      });
    } catch (error) {
      console.error('Error tracking impression:', error);
    }
  };

  // Track impression on mount
  React.useEffect(() => {
    handleImpression();
  }, []);

  return (
    <div 
      className="border-b border-border p-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all cursor-pointer"
      onClick={handleClick}
    >
      {/* Sponsored Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold rounded">
          SPONSORED
        </div>
        <span className="text-xs text-muted-foreground">Promoted content</span>
      </div>

      <div className="flex space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white font-bold">
          {post.advertiser_name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1 min-w-0">
            <span className="font-bold text-foreground truncate">
              {post.advertiser_name}
            </span>
            <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm flex-shrink-0">
              Sponsored
            </span>
          </div>

          {post.title && (
            <h3 className="font-bold text-lg mt-2">{post.title}</h3>
          )}

          <div 
            className="post-content text-foreground mt-1 whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: parseContent(post.content) }}
          />

          {/* Image */}
          {post.image_url && (
            <div className="mt-3 rounded-2xl overflow-hidden">
              <img 
                src={post.image_url} 
                alt={post.title} 
                className="w-full h-full object-cover max-h-96" 
              />
            </div>
          )}

          {/* Video */}
          {post.video_url && (
            <div className="mt-3 rounded-2xl overflow-hidden bg-black max-h-[600px]">
              <video
                controls
                className="w-full h-full max-h-[600px] object-contain"
                playsInline
                preload="metadata"
              >
                <source src={post.video_url} type="video/mp4" />
              </video>
            </div>
          )}

          {/* Call to Action */}
          {post.target_url && (
            <div className="mt-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-full transition-all">
                Learn More
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
