import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// AI Bot User ID - you'll need to create this user first
const AI_BOT_USER_ID = 'ai-news-bot-id'; // Replace with actual user ID after creation

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

// Fetch news from News API (you'll need to add NEWS_API_KEY to secrets)
async function fetchNews(): Promise<NewsArticle[]> {
  const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
  
  if (!NEWS_API_KEY) {
    console.log('NEWS_API_KEY not found, using demo data');
    return getDemoNews();
  }

  try {
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${NEWS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`News API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
    }));
  } catch (error) {
    console.error('Error fetching news:', error);
    return getDemoNews();
  }
}

function getDemoNews(): NewsArticle[] {
  const topics = [
    'Breaking: Major tech advancement announced today',
    'Global markets react to latest economic data',
    'Scientists discover potential breakthrough in renewable energy',
    'International summit addresses climate change initiatives',
    'Sports: Championship finals set to begin this weekend',
  ];

  return topics.map((topic, index) => ({
    title: topic,
    description: `Latest updates on ${topic.toLowerCase()}. Stay informed with real-time news.`,
    url: `https://example.com/news/${index}`,
    source: 'T News AI',
    publishedAt: new Date().toISOString(),
  }));
}

async function createNewsPost(article: NewsArticle, botUserId: string) {
  // Create engaging post content
  const content = `📰 ${article.title}\n\n${article.description}\n\n🔗 ${article.url}\n\n#Breaking #News #${article.source.replace(/\s+/g, '')}`;

  const { data, error } = await supabaseAdmin
    .from('posts')
    .insert({
      user_id: botUserId,
      content: content.substring(0, 500), // Limit to 500 chars
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    throw error;
  }

  return data;
}

async function getOrCreateAIBot() {
  // Check if AI bot user exists
  const { data: existingProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('username', 'NewsAI')
    .single();

  if (existingProfile) {
    return existingProfile.id;
  }

  // If bot doesn't exist, create it
  // Note: You'll need to create this user manually through Supabase Auth first
  // or use the admin API to create the auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'newsai@tsocial.app',
    email_confirm: true,
    user_metadata: {
      username: 'NewsAI',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=NewsAI',
      verified: true,
    },
  });

  if (authError) {
    console.error('Error creating auth user:', authError);
    throw authError;
  }

  // The user_profile should be created automatically by the trigger
  // Wait a bit for the trigger to complete
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: newProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('id', authUser.user.id)
    .single();

  if (!newProfile) {
    throw new Error('Failed to create AI bot profile');
  }

  // Update profile to mark as verified
  await supabaseAdmin
    .from('user_profiles')
    .update({ verified: true })
    .eq('id', newProfile.id);

  return newProfile.id;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('AI News Bot: Starting news fetch and post...');

    // Get or create AI bot user
    const botUserId = await getOrCreateAIBot();
    console.log('AI Bot User ID:', botUserId);

    // Fetch latest news
    const articles = await fetchNews();
    console.log(`Fetched ${articles.length} news articles`);

    // Create a post for the first article (you can modify to post multiple)
    const article = articles[0];
    const post = await createNewsPost(article, botUserId);

    console.log('Created news post:', post.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'News post created successfully',
        post_id: post.id,
        article: article.title,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('AI News Bot error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
