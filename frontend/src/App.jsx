import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CityProvider } from './contexts/CityContext';
import CustomerLayout from './components/layout/CustomerLayout';
import AdminLayout from './components/layout/AdminLayout';
import Skeleton from './components/ui/Skeleton';

// Public Pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));

// Customer Pages
const Dashboard = lazy(() => import('./pages/customer/Dashboard'));
const CitiesExplorer = lazy(() => import('./pages/customer/CitiesExplorer'));
const CityDetails = lazy(() => import('./pages/customer/CityDetails'));
const HotelInfo = lazy(() => import('./pages/customer/HotelInfo'));
const ItineraryInfo = lazy(() => import('./pages/customer/ItineraryInfo'));
const AssistantPage = lazy(() => import('./pages/customer/AssistantPage'));
const MyBookings = lazy(() => import('./pages/customer/MyBookings'));
const BookingDetails = lazy(() => import('./pages/customer/BookingDetails'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const Feedback = lazy(() => import('./pages/customer/Feedback'));
const ConversationHistory = lazy(() => import('./pages/customer/ConversationHistory'));
const VoiceCall = lazy(() => import('./pages/customer/VoiceCall'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const CityManagement = lazy(() => import('./pages/admin/CityManagement'));
const HotelManagement = lazy(() => import('./pages/admin/HotelManagement'));
const InventoryManagement = lazy(() => import('./pages/admin/InventoryManagement'));
const ReservationManagement = lazy(() => import('./pages/admin/ReservationManagement'));
const KnowledgeBase = lazy(() => import('./pages/admin/KnowledgeBase'));
const DocumentProcessing = lazy(() => import('./pages/admin/DocumentProcessing'));
const FeedbackManagement = lazy(() => import('./pages/admin/FeedbackManagement'));
const CallLogs = lazy(() => import('./pages/admin/CallLogs'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const SystemSettings = lazy(() => import('./pages/admin/SystemSettings'));

// Error Pages
const NotFound = lazy(() => import('./pages/errors/NotFound'));
const Unauthorized = lazy(() => import('./pages/errors/Unauthorized'));

function PageSkeleton() {
  return (
    <div className="p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
      <Skeleton width="40%" height="40px" />
      <Skeleton width="100%" height="200px" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton height="150px" />
        <Skeleton height="150px" />
        <Skeleton height="150px" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[var(--color-brand-500)] border-t-transparent rounded-full"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/unauthorized" />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={isAuthenticated ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Customer Routes */}
      <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cities" element={<CitiesExplorer />} />
        <Route path="/cities/:id" element={<CityDetails />} />
        <Route path="/hotels/:id" element={<HotelInfo />} />
        <Route path="/itineraries/:id" element={<ItineraryInfo />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:bookingId" element={<BookingDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/conversations" element={<ConversationHistory />} />
        <Route path="/voice-call" element={<VoiceCall />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/cities" element={<CityManagement />} />
        <Route path="/admin/hotels" element={<HotelManagement />} />
        <Route path="/admin/inventory" element={<InventoryManagement />} />
        <Route path="/admin/reservations" element={<ReservationManagement />} />
        <Route path="/admin/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/admin/documents" element={<DocumentProcessing />} />
        <Route path="/admin/feedback" element={<FeedbackManagement />} />
        <Route path="/admin/call-logs" element={<CallLogs />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/settings" element={<SystemSettings />} />
      </Route>

      {/* Error */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CityProvider>
            <Suspense fallback={<PageSkeleton />}>
              <AppRoutes />
            </Suspense>
            <Toaster position="top-right" toastOptions={{
              className: '!bg-[var(--color-bg-primary)] !text-[var(--color-text-primary)] !border !border-[var(--color-border-primary)] !shadow-[var(--shadow-xl)] !rounded-xl',
              duration: 4000,
            }} />
          </CityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
