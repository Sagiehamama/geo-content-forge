
import { z } from "zod";

export interface FormData {
  prompt: string;
  country: string;
  language: string;
  tone: string;
  toneUrl: string;
  toneType: 'description' | 'url';
  useAiMedia: boolean;
  mediaFile: File | null;
  wordCount: number;
  // New fields for content generator
  contentType: 'blog' | 'article' | 'product';
  audience: string;
  includeImages: boolean;
  includeFrontmatter: boolean;
}

export const initialFormData: FormData = {
  prompt: '',
  country: '',
  language: 'en',
  tone: '',
  toneUrl: '',
  toneType: 'description',
  useAiMedia: true,
  mediaFile: null,
  wordCount: 1000,
  // Initialize new fields
  contentType: 'blog',
  audience: 'general',
  includeImages: true,
  includeFrontmatter: true,
};

export const formSchema = z.object({
  prompt: z.string().min(1, { message: "Please enter an AI prompt to rank for" }),
  country: z.string(),
  language: z.string(),
  tone: z.string().optional(),
  toneUrl: z.string().optional(),
  toneType: z.enum(['description', 'url']),
  useAiMedia: z.boolean(),
  wordCount: z.number().min(300).max(3000),
  // New field validations
  contentType: z.enum(['blog', 'article', 'product']),
  audience: z.string(),
  includeImages: z.boolean(),
  includeFrontmatter: z.boolean(),
});

export interface GeneratedContent {
  title: string;
  content: string;
  frontmatter: ContentFrontmatter;
  images: ContentImage[];
  readingTime: number;
  wordCount: number;
  seoScore: number;
  readabilityScore: string;
  factCheckScore: number;
}

export interface ContentFrontmatter {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  author: string;
  date: string;
  featuredImage?: string;
}

export interface ContentImage {
  url: string;
  alt: string;
  caption: string;
}

export const mockGeneratedContent: GeneratedContent = {
  title: "How to Optimize Your Website for Search Engines",
  content: `
# How to Optimize Your Website for Search Engines

_Published on May 22, 2025_

Search engine optimization (SEO) is essential for any website looking to increase visibility and attract organic traffic. With the right strategy, you can improve your ranking on search engine results pages (SERPs) and reach more potential customers.

## Understanding SEO Basics

SEO begins with understanding how search engines work. Search engines use complex algorithms to determine which websites appear in search results and in what order. These algorithms consider various factors, including:

- **Relevance**: How well your content matches the search query
- **Authority**: How trustworthy and reputable your website is
- **User experience**: How easy your website is to navigate and use
- **Mobile-friendliness**: How well your website performs on mobile devices

By optimizing these factors, you can improve your website's ranking and attract more visitors.

## Key SEO Strategies

### 1. Keyword Research

Keyword research is the foundation of SEO. It involves identifying the terms and phrases that people use when searching for products, services, or information related to your business. Tools like Google Keyword Planner, SEMrush, and Ahrefs can help you find relevant keywords with high search volume and low competition.

### 2. On-Page Optimization

On-page optimization involves optimizing individual web pages to rank higher in search results. This includes:

- **Title tags**: Include your target keyword in the title tag
- **Meta descriptions**: Write compelling meta descriptions that include your target keyword
- **Headings**: Use H1, H2, and H3 tags to structure your content
- **Content**: Create high-quality, relevant content that satisfies user intent
- **Internal linking**: Link to other relevant pages on your website
- **URL structure**: Create clean, descriptive URLs that include your target keyword

### 3. Technical SEO

Technical SEO focuses on improving the technical aspects of your website to help search engines crawl and index your content. This includes:

- **Site speed**: Optimize your website's loading speed
- **Mobile-friendliness**: Ensure your website is responsive and works well on mobile devices
- **Sitemap**: Create an XML sitemap to help search engines index your content
- **Robots.txt**: Use a robots.txt file to control which pages search engines can access
- **Schema markup**: Implement schema markup to help search engines understand your content

### 4. Local SEO

If you have a brick-and-mortar business or serve specific geographic areas, local SEO is crucial. This includes:

- **Google My Business**: Create and optimize your Google My Business listing
- **Local keywords**: Include location-specific keywords in your content
- **NAP consistency**: Ensure your name, address, and phone number are consistent across all online platforms
- **Local backlinks**: Obtain backlinks from local websites and directories

## Measuring SEO Success

To determine if your SEO efforts are working, you need to track key metrics, such as:

- **Organic traffic**: The number of visitors coming to your website from search engines
- **Keyword rankings**: Where your website appears in search results for target keywords
- **Bounce rate**: The percentage of visitors who leave your website after viewing only one page
- **Conversion rate**: The percentage of visitors who complete a desired action, such as making a purchase or filling out a contact form

By regularly monitoring these metrics, you can adjust your SEO strategy as needed to achieve better results.

## Conclusion

SEO is an ongoing process that requires time, effort, and patience. By implementing the strategies outlined above and staying up-to-date with search engine algorithm changes, you can improve your website's visibility, attract more visitors, and achieve your business goals.

Remember, SEO is not about tricking search engines but about providing value to your users. Focus on creating high-quality content that answers users' questions and addresses their needs, and the rankings will follow.
  `,
  frontmatter: {
    title: "How to Optimize Your Website for Search Engines",
    description: "Learn effective SEO strategies to improve your website's visibility and attract more organic traffic.",
    tags: ["SEO", "Digital Marketing", "Website Optimization", "Search Engines"],
    slug: "how-to-optimize-your-website-for-search-engines",
    author: "AI Content Generator",
    date: "2025-05-22",
    featuredImage: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
  },
  images: [
    {
      url: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Computer screen showing analytics dashboard",
      caption: "SEO analytics help track the performance of your optimization efforts"
    },
    {
      url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
      alt: "Person typing on laptop",
      caption: "Regular content updates are crucial for SEO success"
    }
  ],
  readingTime: 5,
  wordCount: 650,
  seoScore: 94,
  readabilityScore: "Grade 8",
  factCheckScore: 100
};
