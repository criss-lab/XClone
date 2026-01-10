import { TopBar } from '@/components/layout/TopBar';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, MessageCircle, Mail, Book } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: 'Getting Started',
    question: 'How do I create an account?',
    answer: 'Click the "Sign up" button on the auth page. You can sign up using your email or Google account. Follow the prompts to create your profile.',
  },
  {
    category: 'Getting Started',
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot password?" Enter your email address and we\'ll send you a password reset link.',
  },
  {
    category: 'Posts & Content',
    question: 'How do I create a post?',
    answer: 'Click the "+" button (mobile) or "Post" button (desktop). Write your content (up to 700 characters), add images/videos (up to 4 images or 20MB video), and click "Post".',
  },
  {
    category: 'Posts & Content',
    question: 'Can I edit or delete my posts?',
    answer: 'Yes! Click the three dots menu (⋯) on your post and select "Edit" or "Delete". Edit history is tracked and visible to viewers.',
  },
  {
    category: 'Posts & Content',
    question: 'How do I upload videos?',
    answer: 'When creating a post, click the video icon and select a video file (up to 20MB). Supported formats: MP4, WebM, MOV. Videos will autoplay in the feed.',
  },
  {
    category: 'Posts & Content',
    question: 'What are hashtags and how do I use them?',
    answer: 'Hashtags (#example) categorize your content. Type # followed by a word in your post. You can follow hashtags to see related content in your feed.',
  },
  {
    category: 'Engagement',
    question: 'What\'s the difference between like, repost, and quote?',
    answer: 'Like: Show appreciation. Repost: Share to your followers. Quote: Repost with your own comment added.',
  },
  {
    category: 'Engagement',
    question: 'How do I follow someone?',
    answer: 'Visit their profile and click "Follow". You\'ll see their posts in your "Following" feed.',
  },
  {
    category: 'Engagement',
    question: 'What are Spaces?',
    answer: 'Spaces are live audio (or video) conversations. You can join as a listener or request to speak. Recordings are available for 24 hours after the Space ends.',
  },
  {
    category: 'Monetization',
    question: 'How do I enable monetization?',
    answer: 'To qualify for monetization, you need: 1,000+ followers, 10,000+ total post views, and 2%+ average engagement rate. Check your Creator Studio for eligibility.',
  },
  {
    category: 'Monetization',
    question: 'What are the Premium tiers?',
    answer: 'Basic ($4.99/mo): Verified badge, edit posts. Premium ($9.99/mo): All Basic + longer posts, analytics. VIP ($19.99/mo): All Premium + monetization, priority support.',
  },
  {
    category: 'Privacy & Safety',
    question: 'How do I make my account private?',
    answer: 'Go to Settings > Privacy & Security > Private Account. When enabled, only approved followers can see your posts.',
  },
  {
    category: 'Privacy & Safety',
    question: 'How do I block or report someone?',
    answer: 'Visit their profile, click the three dots menu (⋯), and select "Block" or "Report". Blocked users cannot see your content or contact you.',
  },
  {
    category: 'Privacy & Safety',
    question: 'Can I delete my account?',
    answer: 'Yes. Go to Settings > Account > Delete Account. This is permanent and cannot be undone. All your posts and data will be deleted.',
  },
  {
    category: 'Features',
    question: 'What are Lists?',
    answer: 'Lists let you organize users into custom groups (e.g., "Friends", "News"). View posts only from users in a specific list.',
  },
  {
    category: 'Features',
    question: 'How do Bookmarks work?',
    answer: 'Click the bookmark icon on any post to save it for later. Access all bookmarks from the sidebar or your profile.',
  },
  {
    category: 'Features',
    question: 'What are Communities?',
    answer: 'Communities are topic-based groups where members can post and discuss specific interests. Join or create communities from the Communities page.',
  },
  {
    category: 'Technical',
    question: 'Why isn\'t my video uploading?',
    answer: 'Check: File size (max 20MB), format (MP4/WebM/MOV), and internet connection. Premium users have higher limits.',
  },
  {
    category: 'Technical',
    question: 'How do I enable notifications?',
    answer: 'Go to Settings > Notifications and toggle "Push Notifications". You\'ll be notified about likes, replies, follows, and mentions.',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqs.map((faq) => faq.category)))];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <TopBar title="Help Center" showBack />

      {/* Search */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-border">
        <h3 className="font-bold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors text-left">
            <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Live Chat</p>
              <p className="text-xs text-muted-foreground">Chat with support</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors text-left">
            <Mail className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Email Support</p>
              <p className="text-xs text-muted-foreground">support@tsocial.com</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/70 transition-colors text-left">
            <Book className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Documentation</p>
              <p className="text-xs text-muted-foreground">Read full docs</p>
            </div>
          </button>
        </div>
      </div>

      {/* FAQs */}
      <div className="p-4">
        <h3 className="font-bold mb-4">
          Frequently Asked Questions ({filteredFAQs.length})
        </h3>
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No results found. Try different keywords.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFAQs.map((faq, index) => {
              const id = `faq-${index}`;
              const isExpanded = expandedId === id;

              return (
                <div key={id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 pr-4">
                      <span className="text-xs font-semibold text-primary">{faq.category}</span>
                      <p className="font-semibold mt-1">{faq.question}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 text-muted-foreground">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Still Need Help */}
      <div className="p-4 m-4 bg-primary/10 border border-primary/20 rounded-lg">
        <h4 className="font-bold mb-2">Still need help?</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <Button className="w-full">Contact Support</Button>
      </div>
    </div>
  );
}
