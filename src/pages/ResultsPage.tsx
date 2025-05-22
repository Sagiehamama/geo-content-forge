import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileInput, Search, Calendar } from 'lucide-react';
import { languages } from '@/constants/languages';

const ResultsPage = () => {
  const navigate = useNavigate();
  
  // This would normally come from an API
  const formData = JSON.parse(localStorage.getItem('contentFormData') || '{}');
  
  // Mock content result
  const [isLoading, setIsLoading] = React.useState(true);
  const [content, setContent] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // Simulate content generation delay
    const timer = setTimeout(() => {
      const mockContent = `
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
      `;
      
      setContent(mockContent);
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleCopyContent = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success('Content copied to clipboard');
    }
  };
  
  const handleDownload = () => {
    if (content) {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-content.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Content downloaded successfully');
    }
  };
  
  const handleCreateNew = () => {
    navigate('/');
  };
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 gradient-heading">Your Generated Content</h1>
        <p className="text-muted-foreground">
          Review your AI-generated, SEO-optimized content
        </p>
      </div>
      
      {isLoading ? (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium">Generating your content...</p>
              <p className="text-muted-foreground mt-2">This may take a few minutes</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle>Content Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="preview">
                    <TabsList className="mb-4">
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="markdown">Markdown</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="preview" className="mt-0">
                      <div className="bg-white rounded-md border p-6 prose max-w-none">
                        {content && (
                          <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }} />
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="markdown" className="mt-0">
                      <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[600px] whitespace-pre-wrap">
                        {content}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle>Content Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Prompt</p>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {formData.prompt || "How to optimize your website for search engines"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.location || "Not specified"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Language</p>
                      <p className="text-sm text-muted-foreground">
                        {languages.find(l => l.code === formData.language)?.name || "English"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-1">Word Count</p>
                      <p className="text-sm text-muted-foreground">
                        {formData.wordCount || 1000} words
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={handleCopyContent}>
                    Copy Content
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleDownload}>
                    Download as Markdown
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={handleCreateNew}>
                    Create New Content
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">SEO Score</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">94/100</span>
                  <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Excellent</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your content is well-optimized for search engines
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Readability</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">Grade 8</span>
                  <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Good</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your content is easy to read and understand
                </p>
              </CardContent>
            </Card>
            
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileInput className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Fact Check</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">100%</span>
                  <span className="text-sm text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">Verified</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  All facts in your content have been verified as accurate
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsPage;
