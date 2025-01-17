import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const FriendProfilePage = () => {
  const { username } = useParams(); 
  const navigate = useNavigate();

  const users = JSON.parse(localStorage.getItem('users')) || [];
  const friend = users.find((user) => user.username === username); 

  if (!friend) {
    return (
      <div className="bg-gray-100 min-h-screen p-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-red-500">User not found</h1>
        <button
          onClick={() => navigate(-1)} 
          className="bg-blue-500 text-white py-2 px-4 rounded mt-4 hover:bg-blue-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">{friend.name}'s Profile</h1>

      <div className="bg-white p-4 rounded shadow mb-6">
        <p><strong>Username:</strong> {friend.username}</p>
        <p><strong>Name:</strong> {friend.name}</p>
        <p><strong>Favorite Genres:</strong></p>
        <ul className="list-disc ml-6">
          {friend.favoriteGenres.length === 0 ? (
            <li>No favorite genres added.</li>
          ) : (
            friend.favoriteGenres.map((genre, index) => <li key={index}>{genre}</li>)
          )}
        </ul>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">Watch History</h2>
        {friend.activityFeed.length === 0 ? (
          <p className="text-gray-600">No recent activity to show.</p>
        ) : (
          <ul className="space-y-4">
            {friend.activityFeed.map((activity, index) => (
              <li key={index} className="bg-gray-100 p-3 rounded shadow">
                <p><strong>Title:</strong> {activity.title}</p>
                <p><strong>Date:</strong> {new Date(activity.timestamp).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendProfilePage;
