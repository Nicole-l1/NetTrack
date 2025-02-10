import React, { useState, useEffect } from 'react';
import {
  sendFriendRequest as sendFriendRequestToDB,
  acceptFriendRequest as acceptFriendRequestInDB,
  rejectFriendRequest as rejectFriendRequestInDB,
  getUserByUsername
} from '../helpers/userHelpers';

const AddFriendPage = ({ user, setUser }) => {
  const [friendUsername, setFriendUsername] = useState('');
  const [message, setMessage] = useState('');
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load friend requests on mount
    const loadFriendRequests = async () => {
      try {
        const result = await getUserByUsername(user.username);
        if (result.success) {
          setFriendRequests(result.user.friendRequests || []);
        }
      } catch (error) {
        console.error('Error loading friend requests:', error);
      }
    };

    loadFriendRequests();

    // Set up a polling interval to check for new friend requests
    const interval = setInterval(loadFriendRequests, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user.username]);

  const handleSendRequest = async () => {
    if (!friendUsername.trim()) {
      setMessage('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const result = await sendFriendRequestToDB(user.username, friendUsername.trim());

      if (result.success) {
        setMessage('Friend request sent!');
        setFriendUsername('');
      } else {
        setMessage(result.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setMessage('An error occurred while sending the friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestUsername) => {
    setLoading(true);
    try {
      const result = await acceptFriendRequestInDB(user.username, requestUsername);

      if (result.success) {
        // Remove from local state
        setFriendRequests(friendRequests.filter((username) => username !== requestUsername));

        // Update user's friends list in state
        const updatedUser = await getUserByUsername(user.username);
        if (updatedUser.success && typeof setUser === "function") {
          setUser(updatedUser.user);
        }

      } else {
        alert('Failed to accept friend request: ' + result.error);
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('An error occurred while accepting the friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestUsername) => {
    setLoading(true);
    try {
      const result = await rejectFriendRequestInDB(user.username, requestUsername);

      if (result.success) {
        setFriendRequests(friendRequests.filter((username) => username !== requestUsername));
      } else {
        alert('Failed to reject friend request: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('An error occurred while rejecting the friend request');
    } finally {
      setLoading(false);
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
          disabled={loading}
          className="w-full mb-2 px-3 py-2 border border-gray-300 rounded text-black bg-gray-100 focus:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
          style={{ color: "black" }}
        />
        <button
          onClick={handleSendRequest}
          disabled={loading}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Sending...' : 'Send Request'}
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
                  disabled={loading}
                  className="bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600 disabled:bg-green-300"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectRequest(requestUsername)}
                  disabled={loading}
                  className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 disabled:bg-red-300"
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