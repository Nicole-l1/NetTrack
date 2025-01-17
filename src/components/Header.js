import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ user, setUser }) => {
  const handleLogout = () => {
    setUser(null); 
  };

  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">NetTrack</h1>
      <div className="space-x-4">
        <Link to="/" className="hover:text-red-500">
          Home
        </Link>
        {user ? (
          <>
            <Link to="/profile" className="hover:text-red-500">
              Profile
            </Link>
            <Link to="/add-friend" className="hover:text-red-500">
                Add Friends
            </Link>
            <Link to="/friends-activity" className="hover:text-red-500">
              Friends Activity
            </Link>
            <Link to="/chat" className="hover:text-red-500">
              Chat
            </Link>
            <button
              onClick={handleLogout}
              className="hover:text-red-500"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-red-500">
              Login
            </Link>
            <Link to="/signup" className="hover:text-red-500">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Header;
