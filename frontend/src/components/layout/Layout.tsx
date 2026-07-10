import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Github, Twitter, LogOut, Workflow } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
  const { user, isLoading: checking, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa] antialiased">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-250 ${
          scrolled ? 'border-b border-slate-100 bg-white/95' : 'bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-base font-bold text-slate-900 transition-transform hover:scale-[1.01]">
            <Workflow className="h-4.5 w-4.5 text-slate-900" />
            <span>Qona</span>
          </Link>

          <div className="hidden items-center gap-7 text-xs font-medium text-slate-500 md:flex">
            {navLinks.map((l) => (
              <Link key={l.label} to={l.href} className="transition-colors hover:text-slate-900">
                {l.label}
              </Link>
            ))}
            {!checking && user ? (
              <>
                <Link to="/dashboard" className="transition-colors hover:text-slate-900">Dashboard</Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/sign-in" className="transition-colors hover:text-slate-900">
                  Sign in
                </Link>
                <Link
                  to="/sign-in"
                  className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
                >
                  Try Qona
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden text-slate-700 hover:text-slate-900 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-6 py-6 md:hidden shadow-lg">
            <div className="flex flex-col gap-4 text-xs font-medium">
              {navLinks.map((l) => (
                <Link key={l.label} to={l.href} className="text-slate-500 hover:text-slate-900" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
              {user ? (
                <>
                  <Link to="/dashboard" className="text-slate-500 hover:text-slate-900" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <button onClick={() => { handleSignOut(); setMenuOpen(false); }} className="rounded-lg bg-slate-900 py-2 text-center font-medium text-white shadow-sm hover:bg-slate-800 cursor-pointer">Sign out</button>
                </>
              ) : (
                <>
                  <Link to="/sign-in" className="text-slate-500 hover:text-slate-900" onClick={() => setMenuOpen(false)}>Sign in</Link>
                  <Link to="/sign-in" className="rounded-lg bg-slate-900 py-2 text-center font-medium text-white shadow-sm hover:bg-slate-800" onClick={() => setMenuOpen(false)}>Try Qona</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-14">
        <Outlet />
      </main>

      <footer className="border-t border-slate-100 bg-white px-4 py-16 lg:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-1">
              <Link to="/" className="text-sm font-bold text-slate-900">Qona</Link>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">AI-powered automation builder.</p>
            </div>
            {Object.entries(footerSections).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{category}</h4>
                <ul className="mt-4 space-y-2.5">
                  {links.map((link) => {
                    const slug = link.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <li key={link}>
                        <Link to={`/${slug}`} className="text-xs text-slate-500 transition-colors hover:text-slate-900">
                          {link}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
            <p className="text-[10px] text-slate-400">&copy; {new Date().getFullYear()} Qona, Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-350 hover:text-slate-650 transition-colors"><Github className="h-4 w-4" /></a>
              <a href="#" className="text-slate-350 hover:text-slate-650 transition-colors"><Twitter className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
