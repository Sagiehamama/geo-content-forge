import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-muted py-4 mt-8">
      <div className="container">
        <div className="border-t border-border pt-4 text-muted-foreground text-sm flex flex-col items-center gap-2">
          <span className="font-medium text-base gradient-heading">ContentBot</span>
          <p>© 2025 ContentBot. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
