
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-muted py-6 mt-16">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <span className="font-bold text-xl gradient-heading">ContentBot</span>
            <p className="mt-2 text-muted-foreground max-w-xs">
              Automated content creation with SEO and GEO optimization for better search results.
            </p>
          </div>
        </div>
        
        <div className="border-t border-border mt-6 pt-4 text-muted-foreground text-sm">
          <p>© 2025 ContentBot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
