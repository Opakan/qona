import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Product from './pages/Product';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Integrations from './pages/Integrations';
import Api from './pages/Api';
import Resources from './pages/Resources';
import Documentation from './pages/Documentation';
import Tutorials from './pages/Tutorials';
import Blog from './pages/Blog';
import Community from './pages/Community';
import About from './pages/About';
import Contact from './pages/Contact';
import Press from './pages/Press';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import GDPR from './pages/GDPR';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Billing from './pages/Billing';
import PaymentSuccess from './pages/PaymentSuccess';
import AuthCallback from './pages/AuthCallback';
import AuthGuard from './components/auth/AuthGuard';
import GuestGuard from './components/auth/GuestGuard';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public layout routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/product" element={<Product />} />
          <Route path="/workflow-builder" element={<WorkflowBuilder />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/api" element={<Api />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/community" element={<Community />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/press" element={<Press />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/gdpr" element={<GDPR />} />
          <Route path="/sign-in" element={<GuestGuard><SignIn /></GuestGuard>} />
        </Route>

        {/* Auth pages (no layout) */}
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
        <Route path="/billing" element={<AuthGuard><Billing /></AuthGuard>} />
        <Route path="/payment/success" element={<AuthGuard><PaymentSuccess /></AuthGuard>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
