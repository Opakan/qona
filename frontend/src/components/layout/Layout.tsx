import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X, Github, Twitter } from 'lucide-react';

const navLinks = [
  { label: 'Product', href: '/product' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
];

const footerSections = {
  Product: ['Workflow builder', 'Integrations', 'API'],
  Resources: ['Documentation', 'Tutorials', 'Blog', 'Community'],
  Company: ['About', 'Contact', 'Press'],
  Legal: ['Terms of Service', 'Privacy Policy', 'Cookie Policy', 'GDPR'],
};

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white antialiased">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          scrolled ? 'border-b border-gray-100 bg-white/80 backdrop-blur-md' : ''
        }`}
      >
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="text-sm font-medium tracking-tight text-gray-900">
            Qona
          </Link>

          <div className="hidden items-center gap-7 text-sm text-gray-500 md:flex">
            {navLinks.map((l) => (
              <Link key={l.label} to={l.href} className="transition-colors hover:text-gray-900">
                {l.label}
              </Link>
            ))}
            <Link to="/sign-in" className="transition-colors hover:text-gray-900">
              Sign in
            </Link>
            <Link
              to="/sign-in"
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Try Qona
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-6 md:hidden">
            <div className="flex flex-col gap-4 text-sm">
              {navLinks.map((l) => (
                <Link key={l.label} to={l.href} className="text-gray-600" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <Link to="/sign-in" className="text-gray-600" onClick={() => setMenuOpen(false)}>Sign in</Link>
              <Link to="/sign-in" className="rounded-lg bg-gray-900 px-4 py-2 text-center text-white" onClick={() => setMenuOpen(false)}>Try Qona</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-14">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Link to="/" className="text-sm font-medium text-gray-900">Qona</Link>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">AI-powered automation.</p>
            </div>
            {Object.entries(footerSections).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{category}</h4>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => {
                    const slug = link.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <li key={link}>
                        <Link to={`/${slug}`} className="text-sm text-gray-500 transition-colors hover:text-gray-900">
                          {link}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
            <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Qona, Inc.</p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-300 hover:text-gray-600"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-gray-300 hover:text-gray-600"><Twitter className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
