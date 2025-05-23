import { RedditPost, RedditThread, RedditComment } from "./types.ts";

// Reddit scraper using official Reddit API with OAuth
export class RedditScraper {
  private requestCount = 0;
  private readonly MAX_REQUESTS_PER_SESSION = 50;
  private readonly DELAY_BETWEEN_REQUESTS = 1000; // 1 second (60/min limit)
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async initialize() {
    try {
      console.log("Reddit API scraper initialized");
      await this.getAccessToken();
    } catch (error) {
      console.error("Failed to initialize Reddit scraper:", error);
      throw error;
    }
  }

  private async getAccessToken(): Promise<void> {
    // Check if token is still valid (expires in 1 hour)
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    const clientId = Deno.env.get('REDDIT_CLIENT_ID');
    const clientSecret = Deno.env.get('REDDIT_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials not configured');
    }

    try {
      console.log("Getting Reddit API access token...");
      
      const auth = btoa(`${clientId}:${clientSecret}`);
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'ContentCreatorBot/1.0 by BigCommunity7454'
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        throw new Error(`Reddit OAuth error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early
      
      console.log("Reddit API access token obtained successfully");
    } catch (error) {
      console.error("Failed to get Reddit access token:", error);
      throw error;
    }
  }

  async scrapeSubredditPosts(subreddit: string, limit: number = 5): Promise<RedditPost[]> {
    try {
      console.log(`Scraping r/${subreddit} for ${limit} posts...`);
      
      // Ensure we have a valid token
      await this.getAccessToken();
      
      // Rate limiting
      await this.delay(this.DELAY_BETWEEN_REQUESTS);
      this.requestCount++;

      if (this.requestCount >= this.MAX_REQUESTS_PER_SESSION) {
        throw new Error("Rate limit exceeded for this session");
      }

      const url = `https://oauth.reddit.com/r/${subreddit}/hot?limit=${limit}`;
      console.log(`Fetching: ${url}`);

      // Use Reddit OAuth API
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'ContentCreatorBot/1.0 by BigCommunity7454'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();

      if (!jsonData.data || !jsonData.data.children) {
        console.log(`No posts found in r/${subreddit}`);
        return [];
      }

      const posts: RedditPost[] = jsonData.data.children
        .filter((child: any) => child.kind === 't3') // t3 = link/post
        .map((child: any) => {
          const post = child.data;
          return {
            id: post.id,
            title: post.title || '',
            body: post.selftext || '',
            url: `https://www.reddit.com${post.permalink}`,
            upvotes: post.ups || 0,
            comments_count: post.num_comments || 0,
            created_at: new Date(post.created_utc * 1000).toISOString(),
            subreddit: post.subreddit,
            author: post.author || '[deleted]',
            permalink: post.permalink,
          };
        })
        .filter((post: RedditPost) => post.title.length > 0); // Filter out empty posts

      console.log(`Successfully scraped ${posts.length} posts from r/${subreddit}`);
      return posts;

    } catch (error) {
      console.error(`Error scraping r/${subreddit}:`, error);
      throw error;
    }
  }

  async scrapeFullThread(postUrl: string): Promise<RedditThread | null> {
    try {
      console.log(`Scraping full thread: ${postUrl}`);
      
      // Ensure we have a valid token
      await this.getAccessToken();
      
      // Rate limiting
      await this.delay(this.DELAY_BETWEEN_REQUESTS);
      this.requestCount++;

      // Extract post ID from URL and construct API URL
      const postId = postUrl.split('/comments/')[1]?.split('/')[0];
      if (!postId) {
        throw new Error("Could not extract post ID from URL");
      }
      
      const apiUrl = `https://oauth.reddit.com/comments/${postId}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'ContentCreatorBot/1.0 by BigCommunity7454'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();

      if (!Array.isArray(jsonData) || jsonData.length < 2) {
        throw new Error("Invalid thread data structure");
      }

      // First element contains the post, second contains comments
      const postData = jsonData[0].data.children[0].data;
      const commentsData = jsonData[1].data.children;

      const post: RedditThread = {
        id: postData.id,
        title: postData.title || '',
        body: postData.selftext || '',
        url: `https://www.reddit.com${postData.permalink}`,
        upvotes: postData.ups || 0,
        comments_count: postData.num_comments || 0,
        created_at: new Date(postData.created_utc * 1000).toISOString(),
        subreddit: postData.subreddit,
        author: postData.author || '[deleted]',
        permalink: postData.permalink,
        comments: this.parseComments(commentsData),
      };

      console.log(`Successfully scraped thread with ${post.comments.length} top-level comments`);
      return post;

    } catch (error) {
      console.error(`Error scraping thread ${postUrl}:`, error);
      return null;
    }
  }

  private parseComments(commentsData: any[], maxDepth: number = 2, currentDepth: number = 0): RedditComment[] {
    if (currentDepth >= maxDepth) return [];

    return commentsData
      .filter((child: any) => child.kind === 't1' && child.data.body) // t1 = comment
      .map((child: any) => {
        const comment = child.data;
        return {
          id: comment.id,
          body: comment.body || '',
          author: comment.author || '[deleted]',
          upvotes: comment.ups || 0,
          created_at: new Date(comment.created_utc * 1000).toISOString(),
          replies: comment.replies && comment.replies.data ? 
            this.parseComments(comment.replies.data.children, maxDepth, currentDepth + 1) : 
            [],
        };
      })
      .filter((comment: RedditComment) => 
        comment.body.length > 10 && 
        !comment.body.includes('[deleted]') && 
        !comment.body.includes('[removed]')
      );
  }

  async validateSubreddit(subreddit: string): Promise<boolean> {
    try {
      console.log(`Validating subreddit: r/${subreddit}`);
      
      // Ensure we have a valid token
      await this.getAccessToken();
      
      const url = `https://oauth.reddit.com/r/${subreddit}/about`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': 'ContentCreatorBot/1.0 by BigCommunity7454'
        },
      });

      if (!response.ok) {
        console.log(`Subreddit validation failed - HTTP ${response.status}: ${response.statusText}`);
        return false;
      }

      const data = await response.json();
      
      // Check if subreddit exists and is accessible
      if (!data || !data.data) {
        console.log(`Subreddit validation failed - no data returned`);
        return false;
      }

      // Allow all subreddits except explicitly NSFW ones
      const isValid = data.data.display_name && !data.data.over18;
      console.log(`Subreddit r/${subreddit} validation: ${isValid ? 'VALID' : 'INVALID'} (NSFW: ${data.data.over18})`);
      
      return isValid;
    } catch (error) {
      console.error(`Error validating r/${subreddit}:`, error);
      return false;
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup() {
    try {
      console.log("Reddit scraper cleanup completed");
      // No cleanup needed for OAuth approach
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }
} 