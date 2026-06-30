import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/landing'; 
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext'; // 1. Import Provider
import VideoMeetComponent from './pages/videomeet';
import HomeComponent from './pages/home';
import History from './pages/history';
import PostCallComponent from './pages/post-call';

const GuestPage = () => <h1>Join as Guest Page</h1>;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider> 
           {/* Context wraps Routes, so LandingPage inside Routes can use it */}
           <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<Authentication />} />
              <Route path="/post-call" element={<PostCallComponent />} />
              <Route path="/:url" element={<VideoMeetComponent />} />
              <Route path='/home' element={<HomeComponent />} />
              <Route path='/history' element={<History />} />
           </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;