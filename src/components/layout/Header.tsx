
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="border-b sticky top-0 z-10 bg-background">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl gradient-heading">ContentBot</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              isActive ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"
            }
          >
            Create Content
          </NavLink>
          <NavLink 
            to="/results" 
            className={({ isActive }) => 
              isActive ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"
            }
          >
            Results
          </NavLink>
          <NavLink 
            to="/history" 
            className={({ isActive }) => 
              isActive ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"
            }
          >
            History
          </NavLink>
        </nav>

        <div>
          <Button variant="outline" className="hidden md:inline-flex mr-2">
            Sign In
          </Button>
          <Button>Get Started</Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
