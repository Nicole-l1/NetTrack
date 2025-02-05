import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Import default profile icon
let defaultProfileIcon;
try {
    defaultProfileIcon = require('../assets/images/profile-icon.png');
} catch (e) {
    console.warn('Default profile icon not found');
    defaultProfileIcon = null;
}

// Avatar component that shows user avatar or default icon
const UserAvatar = ({ avatar, alt, size, className = "", style = {} }) => {
    const hasAvatar = avatar && avatar !== "https://via.placeholder.com/150";

    if (hasAvatar) {
        return (
            <img
                src={avatar}
                alt={alt}
                className={className}
                style={style}
            />
        );
    }

    // Show default icon in white circle
    return (
        <div
            className={className}
            style={{
                ...style,
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {defaultProfileIcon ? (
                <img
                    src={defaultProfileIcon}
                    alt={alt}
                    style={{
                        width: `${parseInt(size) * 0.6}px`,
                        height: `${parseInt(size) * 0.6}px`
                    }}
                />
            ) : (
                <span style={{ fontSize: `${parseInt(size) * 0.5}px`, color: '#333' }}>👤</span>
            )}
        </div>
    );
};

const FriendProfilePage = () => {
    const { username } = useParams();
    const [friendData, setFriendData] = useState(null);
    const [watchHistory, setWatchHistory] = useState([]);

    useEffect(() => {
        const fetchFriendData = () => {
            const users = JSON.parse(localStorage.getItem("users")) || [];
            const selectedUser = users.find((u) => u.username === username);

            if (selectedUser) {
                setFriendData(selectedUser);

                const activityFeed = selectedUser.activityFeed || [];

                const sortedActivity = activityFeed.sort(
                    (a, b) => new Date(b.timestampPosted) - new Date(a.timestampPosted)
                );

                setWatchHistory(sortedActivity);
            }
        };

        fetchFriendData();

        const handleStorageChange = () => fetchFriendData();
        window.addEventListener("storage", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
        };
    }, [username]);

    const formatTimestamp = (timestamp) => {
        try {
            return new Date(timestamp).toLocaleString();
        } catch {
            return "Invalid Date";
        }
    };

    if (!friendData) {
        return <p>No user found.</p>;
    }

    return (
        <div className="bg-gray-100 p-6 min-h-screen">
            <div className="bg-white p-4 rounded shadow-md">
                <div className="flex items-center space-x-4">
                    <UserAvatar
                        avatar={friendData.avatar || "https://via.placeholder.com/150"}
                        alt={`${friendData.name}'s avatar`}
                        size="80"
                        className="w-20 h-20 rounded-full"
                        style={{
                            width: '80px',
                            height: '80px'
                        }}
                    />
                    <div>
                        <h1 className="text-2xl font-bold">{friendData.name}</h1>
                        <p className="text-gray-500">@{friendData.username}</p>
                    </div>
                </div>

                <div className="mt-4">
                    <h2 className="text-xl font-bold">Favorite Genres</h2>
                    {friendData.favoriteGenres && friendData.favoriteGenres.length > 0 ? (
                        <div className="flex flex-wrap space-x-2">
                            {friendData.favoriteGenres.map((genre, index) => (
                                <span
                                    key={index}
                                    className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm"
                                >
                                    {genre}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No favorite genres added yet.</p>
                    )}
                </div>

                <div className="mt-4">
                    <h2 className="text-xl font-bold">Watch History</h2>
                    {watchHistory.length > 0 ? (
                        watchHistory.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-gray-50 p-2 rounded shadow mb-2"
                            >
                                <p className="text-lg font-medium">{activity.title}</p>
                                <p className="text-gray-500 text-sm">
                                    {activity.timestampPosted
                                        ? formatTimestamp(activity.timestampPosted)
                                        : "Unknown Date"}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">No watch history available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendProfilePage;