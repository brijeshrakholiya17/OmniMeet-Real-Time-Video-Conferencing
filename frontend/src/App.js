import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/landing'; 
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/videomeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import PostCallComponent from './pages/post-call';

// Helper function to decode JWT payload safely
const parseJwt = (token) => {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
};

// Helper function to check if token is present and unexpired
const isUserAuthenticated = () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    const payload = parseJwt(token);
    if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        return false;
    }
    return true;
};

// ProtectedRoute Component Guard
const ProtectedRoute = ({ children }) => {
    if (!isUserAuthenticated()) {
        return <Navigate to="/auth" state={{ message: "Please log in to access this page.", formState: 0 }} replace />;
    }
    return children;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider> 
           <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Authentication />} />
              <Route path="/post-call" element={<PostCallComponent />} />
              <Route path="/:url" element={<VideoMeetComponent />} />
              
              {/* Strictly Protected Routes */}
              <Route path='/home' element={<ProtectedRoute><HomeComponent /></ProtectedRoute>} />
              <Route path='/history' element={<ProtectedRoute><History /></ProtectedRoute>} />
           </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;