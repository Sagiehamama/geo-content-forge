
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from "lucide-react";

// Mock history data
const mockHistory = [
  {
    id: 1,
    prompt: 'How to optimize your website for search engines',
    date: '2025-05-22T14:30:00',
    wordCount: 1250,
    language: 'English'
  },
  {
    id: 2,
    prompt: 'Best practices for content marketing in 2025',
    date: '2025-05-20T10:15:00',
    wordCount: 1500,
    language: 'English'
  },
  {
    id: 3,
    prompt: 'Social media marketing strategies for small businesses',
    date: '2025-05-18T16:45:00',
    wordCount: 950,
    language: 'English'
  }
];

const HistoryPage = () => {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  const handleViewContent = (id: number) => {
    // In a real app, we'd use the ID to load the specific content
    navigate('/results');
  };
  
  const handleCreateNew = () => {
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
      
      {mockHistory.length > 0 ? (
        <div className="space-y-6">
          {mockHistory.map(item => (
            <Card key={item.id} className="card-hover">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2">{item.prompt}</CardTitle>
                    <CardDescription>
                      Created on {formatDate(item.date)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium bg-muted px-2.5 py-0.5 rounded-full">
                      {item.language}
                    </span>
                    <span className="text-sm font-medium bg-muted px-2.5 py-0.5 rounded-full">
                      {item.wordCount} words
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="pt-4">
                <div className="flex justify-end w-full space-x-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      /* Would implement delete functionality here */
                      alert('Delete functionality would be implemented here');
                    }}
                  >
                    Delete
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewContent(item.id)}
                  >
                    View Content
                  </Button>
                </div>
              </CardFooter>
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
