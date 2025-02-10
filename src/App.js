import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Trending from './components/Trending';
import ActivityFeed from './components/ActivityFeed';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AddFriendPage from './pages/AddFriendsPage';
import FriendsActivityFeed from './pages/FriendsActivityFeed';
import FriendProfilePage from './pages/FriendProfilePage';
import ChatPage from './pages/ChatPage';

function App() {
  useEffect(() => {
    localStorage.removeItem("user");
  }, []);

  const [user, setUserState] = useState(() => {
    const storedUser = sessionStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const setUser = (u) => {
    setUserState(u);
    if (u) {
      sessionStorage.setItem('user', JSON.stringify(u));
    } else {
      sessionStorage.removeItem('user');
    }
  };

  return (
    <Router>
      <div className="bg-black min-h-screen">
        <Header user={user} setUser={setUser} />
        <div className="p-4 bg-black space-y-8">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Trending
                  />
                </>
              }
            />
            <Route path="/login" element={<LoginPage setUser={setUser} />} />
            <Route path="/signup" element={<SignupPage setUser={setUser} />} />
            <Route
              path="/profile"
              element={user ? <ProfilePage user={user} setUser={setUser} /> : <LoginRedirect />}
            />
            <Route
              path="/add-friend"
              element={user ? <AddFriendPage user={user} setUser={setUser} /> : <LoginRedirect />}
            />
            <Route
              path="/friends-activity"
              element={user ? <FriendsActivityFeed user={user} /> : <LoginRedirect />}
            />
            <Route
              path="/friend/:username"
              element={<FriendProfilePage />}
            />
            <Route
              path="/chat"
              element={user ? <ChatPage user={user} /> : <LoginRedirect />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const LoginRedirect = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <h2 className="text-2xl font-bold">You must be logged in to view this page.</h2>
    </div>
  );
};

export default App;
