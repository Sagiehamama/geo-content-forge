
import React from 'react';
import FormSection from '@/components/content/FormSection';

const HomePage = () => {
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-heading">
          AI-Powered Content Creation
        </h1>
        <p className="text-xl text-muted-foreground">
          Generate high-quality, SEO-optimized content with just a few clicks
        </p>
      </div>
      
      <div className="mb-12">
        <FormSection />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="bg-card border rounded-lg p-6 shadow-sm card-hover">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">SEO Optimized</h3>
          <p className="text-muted-foreground">
            Content strategically crafted to rank higher for your target keywords.
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6 shadow-sm card-hover">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">GEO Targeted</h3>
          <p className="text-muted-foreground">
            Location-specific content that resonates with your local audience.
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6 shadow-sm card-hover">
          <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <FileInput className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Fact Checked</h3>
          <p className="text-muted-foreground">
            Every article is verified for accuracy before delivery.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
