import React, { useState } from 'react';
import { sendFriendRequest } from '../helpers/friendHelpers';

const AddFriendPage = ({ user }) => {
  const [friendUsername, setFriendUsername] = useState('');
  const [message, setMessage] = useState('');
  const [friendRequests, setFriendRequests] = useState(
    JSON.parse(localStorage.getItem('users'))
      .find((u) => u.username === user.username)?.friendRequests || [] 
  );

  const handleSendRequest = () => {
    const success = sendFriendRequest(user.username, friendUsername); 
    if (success) {
      setMessage('Friend request sent!');
    } else {
      setMessage('Friend request already sent or user not found.');
    }
    setFriendUsername('');
  };

  const handleAcceptRequest = (requestUsername) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUser = users.find((u) => u.username === user.username);
    const requestUser = users.find((u) => u.username === requestUsername);

    if (currentUser && requestUser) {
      if (!currentUser.friends.includes(requestUsername)) {
        currentUser.friends.push(requestUsername);
      }
      if (!requestUser.friends.includes(user.username)) {
        requestUser.friends.push(user.username);
      }

      currentUser.friendRequests = currentUser.friendRequests.filter(
        (username) => username !== requestUsername
      );

      localStorage.setItem('users', JSON.stringify(users));
      setFriendRequests(currentUser.friendRequests);
    }
  };

  const handleRejectRequest = (requestUsername) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUser = users.find((u) => u.username === user.username);

    if (currentUser) {
      currentUser.friendRequests = currentUser.friendRequests.filter(
        (username) => username !== requestUsername
      );

      localStorage.setItem('users', JSON.stringify(users));
      setFriendRequests(currentUser.friendRequests); 
    }
  };

  return (
    <div className="bg-black text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Add Friends</h1>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Send a Friend Request</h2>
        <input
          type="text"
          placeholder="Enter friend's username"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-black bg-gray-100 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
          style={{ color: "black" }} 
        />
        <button
          onClick={handleSendRequest}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Send Request
        </button>
        {message && <p className="text-sm mt-2">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Friend Requests</h2>
        {friendRequests.length === 0 ? (
          <p className="text-gray-600">No friend requests.</p>
        ) : (
          friendRequests.map((requestUsername) => (
            <div
              key={requestUsername}
              className="bg-white p-4 rounded shadow mb-2 flex justify-between items-center"
            >
              <div>
                <strong>
                  <a
                    href={`/friend/${requestUsername}`}
                    className="text-blue-500 hover:underline"
                  >
                    {requestUsername}
                  </a>
                </strong>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => handleAcceptRequest(requestUsername)}
                  className="bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(requestUsername)}
                  className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AddFriendPage;
