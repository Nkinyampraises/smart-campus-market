import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import SignUp from './pages/SignUp';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerified from './pages/EmailVerified';

// Main Pages
import Home from './pages/Home';
import Browse from './pages/Browse';
import Search from './pages/Search';
import ListingDetail from './pages/ListingDetail';
import ListingExpired from './pages/ListingExpired';

// Listing Management
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import MyListings from './pages/MyListings';
import SellItem from './pages/SellItem';

// Profile
import MyProfile from './pages/MyProfile';
import PublicProfile from './pages/PublicProfile';
import Profile from './pages/Profile';

// User Pages
import Wishlist from './pages/Wishlist';
import MyWishlist from './pages/MyWishlist';
import Transactions from './pages/Transactions';
import Receipt from './pages/Receipt';
import Offers from './pages/Offers';

// Messaging
import Inbox from './pages/Inbox';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminListings from './pages/AdminListings';
import AdminReports from './pages/AdminReports';
import AdminFraud from './pages/AdminFraud';

// Error Pages
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';
import Suspended from './pages/Suspended';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Root → Home */}
            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Auth Routes (public) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/email-verified" element={<EmailVerified />} />

            {/* Main App Routes (home & browse are public landing pages) */}
            <Route path="/home" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/listing/:id" element={<ProtectedRoute><ListingDetail /></ProtectedRoute>} />
            <Route path="/listing-expired/:id" element={<ProtectedRoute><ListingExpired /></ProtectedRoute>} />

            {/* Listing Management */}
            <Route path="/create-listing" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            <Route path="/edit-listing/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="/my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
            <Route path="/sell" element={<ProtectedRoute><SellItem /></ProtectedRoute>} />

            {/* Profile Routes */}
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* User Activity Routes */}
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/my-wishlist" element={<ProtectedRoute><MyWishlist /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/receipt/:transactionId" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
            <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />

            {/* Messaging */}
            <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
            <Route path="/chat/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/listings" element={<ProtectedRoute><AdminListings /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
            <Route path="/admin/fraud" element={<ProtectedRoute><AdminFraud /></ProtectedRoute>} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

            {/* Error / Status Pages */}
            <Route path="/403" element={<Forbidden />} />
            <Route path="/suspended" element={<Suspended />} />

            {/* Catch-all → Not Found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
