import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Trash2, Eye } from "lucide-react";
import { getContentHistory } from '@/services/contentGeneratorService';
import { GeneratedContent } from '@/components/content/form/types';
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define the interface for our history items which extends GeneratedContent
interface ContentHistoryItem extends GeneratedContent {
  generatedAt: string;
  requestId: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ContentHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setFormData, setGeneratedContent, clearContent } = useContent();
  
  const fetchContentHistory = async () => {
    setIsLoading(true);
    try {
      const contentHistory = await getContentHistory();
      setHistory(contentHistory);
    } catch (error) {
      console.error('Error fetching content history:', error);
      toast.error('Failed to load content history');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchContentHistory();
  }, []);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays}d ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    }).format(date);
  };
  
  const handleViewContent = async (item: ContentHistoryItem) => {
    try {
      // First, clear any existing content
      clearContent();
      
      // Get the associated request to populate form data
      const { data: requestData, error: requestError } = await supabase
        .from('content_requests')
        .select('*')
        .eq('id', item.requestId)
        .single();
        
      if (requestError) throw new Error(requestError.message);
      
      // Set form data in context
      setFormData({
        id: requestData.id,
        prompt: requestData.prompt,
        company: requestData.company || '',
        language: requestData.language,
        country: requestData.country,
        toneType: (requestData.tone_type as 'description' | 'url') || 'description',
        tone: requestData.tone || '',
        toneUrl: requestData.tone_url || '',
        wordCount: requestData.word_count,
        includeFrontmatter: requestData.include_frontmatter || false,
        includeImages: requestData.include_images || false,
        enableResearch: false, // Default value
        mediaMode: 'auto', // Default
        mediaFiles: null,
      });
      
      // Set the content in context
      setGeneratedContent(item);
      
      // Navigate to results page to view the content
      navigate('/results');
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    }
  };
  
  const handleDeleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('generated_content')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(error.message);
      
      toast.success('Content deleted successfully');
      // Refresh the history list
      fetchContentHistory();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };
  
  const handleCreateNew = () => {
    clearContent(); // Clear any existing content
    navigate('/');
  };
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 gradient-heading">Content History</h1>
          <p className="text-muted-foreground">
            View and manage your previously generated content
          </p>
        </div>
        
        <Button onClick={handleCreateNew}>Create New Content</Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map(item => (
            <Card key={item.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base line-clamp-1 flex-1 mr-4">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.generatedAt)}
                        </span>
                        <div className="flex gap-2">
                          <span className="bg-muted px-2 py-1 rounded text-xs">
                            {item.wordCount}w
                          </span>
                          <span className="bg-muted px-2 py-1 rounded text-xs">
                            {item.language === 'en' ? 'EN' : item.language.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {item.prompt}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewContent(item)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteContent(item.id || '')}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">No content history found</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              You haven't generated any content yet. Create your first piece of content to get started.
            </p>
            <Button onClick={handleCreateNew}>Create Content</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoryPage;
