
import React from 'react';
import { NavLink } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-muted py-8 mt-16">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <span className="font-bold text-xl gradient-heading">ContentBot</span>
            <p className="mt-2 text-muted-foreground max-w-xs">
              Automated content creation with SEO and GEO optimization for better search results.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Navigation</h3>
              <ul className="space-y-2">
                <li><NavLink to="/" className="text-muted-foreground hover:text-foreground">Create Content</NavLink></li>
                <li><NavLink to="/results" className="text-muted-foreground hover:text-foreground">Results</NavLink></li>
                <li><NavLink to="/history" className="text-muted-foreground hover:text-foreground">History</NavLink></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Learn More</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">FAQ</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 text-muted-foreground text-sm">
          <p>© 2025 ContentBot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
