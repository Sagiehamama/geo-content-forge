import React from 'react';
import FooterAgents from './FooterAgents';

const Footer = () => {
  return (
    <footer className="bg-muted py-4 mt-8">
      <div className="container">
        <div className="border-t border-border pt-4 text-muted-foreground text-sm flex flex-col items-center gap-4">
          <div className="text-center">
            <span className="font-medium text-base gradient-heading">ContentBot</span>
            <p className="text-sm mt-1">Automated content creation with SEO and GEO optimization</p>
          </div>
          <FooterAgents />
          <p>© 2025 ContentBot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
