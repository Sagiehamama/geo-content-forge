
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
    </div>
  );
};

export default HomePage;
