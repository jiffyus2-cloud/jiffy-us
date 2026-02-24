import { Link } from 'react-router';
import { Button } from '../ui/button';
import { DESIGN } from '../../../styles/design-system';
import React from 'react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">Photo Creator</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" asChild size="sm" className="sm:size-default">
            <Link to="/login">Log In</Link>
          </Button>
          <Button asChild size="sm" className="sm:size-lg rounded-lg font-medium">
            <Link to="/registro">Sign Up</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
