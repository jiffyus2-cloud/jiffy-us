import { Link } from 'react-router';
import { Button } from '../ui/button';
import { DESIGN } from '../../../styles/design-system';
import React from 'react';
import logo from '../../../assets/JiffyLogo.svg';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Jiffy" className="h-12 w-auto" />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
            className="flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{language}</span>
          </Button>
          <Button variant="ghost" asChild size="sm" className="sm:size-default">
            <Link to="/login">{t('nav.login')}</Link>
          </Button>
          <Button asChild size="sm" className="sm:size-lg rounded-lg font-medium">
            <Link to="/registro">{t('nav.signup')}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
