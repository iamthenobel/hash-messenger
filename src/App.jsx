import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import OtherUserProfile from "./pages/OtherUserProfile";
import AccountSettings from "./pages/AccountSettings";
import Settings from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import StorageSettings from "./pages/StorageSettings";
import HelpFeedback from "./pages/Help";
import BottomNav from "./components/BottomNav";
import NetworkUnavailable from "./pages/NetworkUnavailable";
import { getUser } from "./services/supabase";

function ProtectedRoute({ element }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await getUser();
        if (error) {
          throw error;
        }

        if (isMounted && data?.user) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }

      if (isMounted) {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      checkAuth();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border border-white/10 bg-white/5 shadow-inner flex items-center justify-center text-white text-xl font-semibold animate-spin">
            #
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
}

export default function App() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const showBottomNav = ["/home", "/settings", "/profile"].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  useEffect(() => {
    const handleConnectivityChange = () => {
      const online = navigator.onLine !== false;
      setIsOnline(online);

      if (online) {
        window.location.reload();
      }
    };

    window.addEventListener("online", handleConnectivityChange);
    window.addEventListener("offline", handleConnectivityChange);

    return () => {
      window.removeEventListener("online", handleConnectivityChange);
      window.removeEventListener("offline", handleConnectivityChange);
    };
  }, []);

  if (!isOnline) {
    return <NetworkUnavailable onRetry={() => window.location.reload()} />;
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/home" element={<ProtectedRoute element={<Home />} />} />
        <Route path="/chat/:chatId" element={<ProtectedRoute element={<Chat />} />} />
        <Route path="/chat/:chatId/profile/:userId" element={<ProtectedRoute element={<OtherUserProfile />} />} />
        <Route path="/profile/:userId?" element={<ProtectedRoute element={<Profile />} />} />
        <Route path="/account" element={<ProtectedRoute element={<AccountSettings />} />} />
        <Route path="/settings" element={<ProtectedRoute element={<Settings />} />} />
        <Route path="/storage-settings" element={<ProtectedRoute element={<StorageSettings />} />} />
        <Route path="/privacy-settings" element={<ProtectedRoute element={<PrivacySettings />} />} />
        <Route path="/help" element={<ProtectedRoute element={<HelpFeedback />} />} />
      </Routes>

      {showBottomNav && <BottomNav />}
    </>
  );
}