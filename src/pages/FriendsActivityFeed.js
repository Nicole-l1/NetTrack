import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
    getUserByUsername,
    getFriends,
    addActivity,
    updateActivity
} from "../helpers/userHelpers";

const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

const FriendsActivityFeed = ({ user, setUser }) => {
    const [friendsActivity, setFriendsActivity] = useState([]);
    const [myActivity, setMyActivity] = useState([]);
    const [comments, setComments] = useState({});
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTitle, setSelectedTitle] = useState(null);
    const [timestamp, setTimestamp] = useState("");
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [selectedEpisode, setSelectedEpisode] = useState(null);
    const [loading, setLoading] = useState(false);
    const location = useLocation();

    // Fetch activities from Firebase
    const fetchActivities = async () => {
        setLoading(true);
        try {
            // Get current user's activity
            const userResult = await getUserByUsername(user.username);
            if (userResult.success) {
                setMyActivity(userResult.user.activityFeed || []);
            }

            // Get friends' activity
            const friendsResult = await getFriends(user.username);
            if (friendsResult.success) {
                const friendsFeed = friendsResult.friends.flatMap((friend) =>
                    (friend.activityFeed || []).map((activity) => ({
                        ...activity,
                        likes: activity.likes || [],
                        comments: activity.comments || [],
                        friendUsername: friend.username,
                        friendName: friend.name,
                        friendAvatar: friend.avatar || "https://via.placeholder.com/50",
                    }))
                );

                const uniqueFriendsActivity = friendsFeed.reduce((acc, activity) => {
                    const exists = acc.find(
                        (a) => a.id === activity.id && a.friendUsername === activity.friendUsername
                    );
                    if (!exists) acc.push(activity);
                    return acc;
                }, []);

                setFriendsActivity(uniqueFriendsActivity);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();

        // Poll for updates every 10 seconds
        const interval = setInterval(fetchActivities, 10000);
        return () => clearInterval(interval);
    }, [user.username]);

    const searchNetflixTitles = async (query) => {
        try {
            const allResults = [];
            for (let page = 1; page <= 5; page++) {
                const movieResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US&page=${page}`
                );
                const movieData = await movieResponse.json();

                if (movieData.results) {
                    allResults.push(
                        ...movieData.results.map((movie) => ({
                            ...movie,
                            media_type: "movie",
                        }))
                    );

                    if (movieData.page >= movieData.total_pages) break;
                }
            }

            for (let page = 1; page <= 5; page++) {
                const tvResponse = await fetch(
                    `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US&page=${page}`
                );
                const tvData = await tvResponse.json();

                if (tvData.results) {
                    allResults.push(
                        ...tvData.results.map((tv) => ({
                            ...tv,
                            media_type: "tv",
                        }))
                    );

                    if (tvData.page >= tvData.total_pages) break;
                }
            }

            const uniqueResults = Array.from(
                new Map(allResults.map((result) => [result.id, result])).values()
            );

            const filteredResults = uniqueResults.filter((result) =>
                (result.title || result.name).toLowerCase().includes(query.toLowerCase())
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Error fetching Netflix titles:", error);
        }
    };

    const fetchSeasonsAndEpisodes = async (tvId) => {
        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}`
            );
            const data = await response.json();

            setSeasons(
                data.seasons.map((season) => ({
                    seasonNumber: season.season_number,
                    episodeCount: season.episode_count,
                }))
            );
        } catch (error) {
            console.error("Error fetching seasons and episodes:", error);
            setSeasons([]);
        }
    };

    const handleTitleSelection = async (title) => {
        setSelectedTitle(title);

        if (title.media_type === "tv") {
            await fetchSeasonsAndEpisodes(title.id);
            setSelectedSeason(null);
            setSelectedEpisode(null);
        } else {
            setSeasons([]);
            setSelectedSeason(null);
            setSelectedEpisode(null);
        }
    };

    const handleAddActivity = async () => {
        if (!selectedTitle || !timestamp || (selectedTitle.media_type === "tv" && (!selectedSeason || !selectedEpisode))) {
            alert("Please fill in all required fields.");
            return;
        }

        const newActivity = {
            id: Date.now(),
            title: selectedTitle.name || selectedTitle.title,
            timestampLeftOff: selectedTitle.media_type === "tv"
                ? `S${selectedSeason}E${selectedEpisode} - ${timestamp}`
                : timestamp,
            timestampPosted: new Date().toISOString(),
            likes: [],
            comments: [],
        };

        try {
            const result = await addActivity(user.username, newActivity);
            if (result.success) {
                setMyActivity([...myActivity, newActivity]);

                // Reset form
                setSelectedTitle(null);
                setTimestamp("");
                setSeasons([]);
                setSelectedSeason(null);
                setSelectedEpisode(null);
                setSearchResults([]);
                setQuery("");
            } else {
                alert('Failed to add activity: ' + result.error);
            }
        } catch (error) {
            console.error('Error adding activity:', error);
            alert('An error occurred while adding activity');
        }
    };

    const handleDeleteActivity = async (activityId) => {
        try {
            const userResult = await getUserByUsername(user.username);
            if (userResult.success) {
                const updatedFeed = userResult.user.activityFeed.filter(a => a.id !== activityId);
                await updateActivity(user.username, activityId, { deleted: true });
                setMyActivity(updatedFeed);
                fetchActivities(); // Refresh activities
            }
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('An error occurred while deleting activity');
        }
    };

    const handleLike = async (activityOwner, activityId) => {
        try {
            const userResult = await getUserByUsername(activityOwner);
            if (!userResult.success) return;

            const activity = userResult.user.activityFeed.find(a => a.id === activityId);
            if (!activity) return;

            const likes = activity.likes || [];
            const isLiked = likes.includes(user.username);

            const updatedLikes = isLiked
                ? likes.filter(username => username !== user.username)
                : [...likes, user.username];

            await updateActivity(activityOwner, activityId, { likes: updatedLikes });
            fetchActivities(); // Refresh to show updated likes
        } catch (error) {
            console.error('Error updating like:', error);
        }
    };

    const handleCommentChange = (activityId, value) => {
        setComments({ ...comments, [activityId]: value });
    };

    const handleComment = async (activityOwner, activityId) => {
        const commentText = comments[activityId];
        if (!commentText || !commentText.trim()) {
            alert("Comment cannot be empty");
            return;
        }

        try {
            const userResult = await getUserByUsername(activityOwner);
            if (!userResult.success) return;

            const activity = userResult.user.activityFeed.find(a => a.id === activityId);
            if (!activity) return;

            const newComment = {
                username: user.username,
                text: commentText.trim(),
                timestamp: new Date().toISOString(),
            };

            const updatedComments = [...(activity.comments || []), newComment];
            await updateActivity(activityOwner, activityId, { comments: updatedComments });

            setComments({ ...comments, [activityId]: "" });
            fetchActivities(); // Refresh to show new comment
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('An error occurred while adding comment');
        }
    };

    const handleDeleteComment = async (activityOwner, activityId, commentIndex) => {
        try {
            const userResult = await getUserByUsername(activityOwner);
            if (!userResult.success) return;

            const activity = userResult.user.activityFeed.find(a => a.id === activityId);
            if (!activity) return;

            const updatedComments = activity.comments.filter((_, index) => index !== commentIndex);
            await updateActivity(activityOwner, activityId, { comments: updatedComments });
            fetchActivities(); // Refresh to show updated comments
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('An error occurred while deleting comment');
        }
    };

    return (
        <div className="bg-black text-white min-h-screen p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-lg font-bold mb-4 text-center">Add Your Activity</h2>

                <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                    <input
                        type="text"
                        placeholder="Search for a Netflix title..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full mb-2 px-4 py-2 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                    />
                    <button
                        onClick={() => searchNetflixTitles(query)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                        Search
                    </button>

                    {searchResults.length > 0 && (
                        <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                            {searchResults.map((result) => (
                                <div
                                    key={result.id}
                                    onClick={() => handleTitleSelection(result)}
                                    className={`p-2 rounded cursor-pointer ${selectedTitle?.id === result.id
                                            ? "bg-blue-600"
                                            : "bg-gray-700 hover:bg-gray-600"
                                        }`}
                                >
                                    {result.title || result.name} ({result.media_type})
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedTitle && selectedTitle.media_type === "tv" && seasons.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <select
                                value={selectedSeason || ""}
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                            >
                                <option value="">Select Season</option>
                                {seasons.map((season) => (
                                    <option key={season.seasonNumber} value={season.seasonNumber}>
                                        Season {season.seasonNumber}
                                    </option>
                                ))}
                            </select>

                            {selectedSeason && (
                                <select
                                    value={selectedEpisode || ""}
                                    onChange={(e) => setSelectedEpisode(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg"
                                >
                                    <option value="">Select Episode</option>
                                    {Array.from(
                                        { length: seasons.find((s) => s.seasonNumber == selectedSeason)?.episodeCount || 0 },
                                        (_, i) => i + 1
                                    ).map((ep) => (
                                        <option key={ep} value={ep}>
                                            Episode {ep}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {selectedTitle && (
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Timestamp (e.g., 45:30)"
                                value={timestamp}
                                onChange={(e) => setTimestamp(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                            />
                            <button
                                onClick={handleAddActivity}
                                className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                            >
                                Add Activity
                            </button>
                        </div>
                    )}
                </div>

                <h2 className="text-lg font-bold mb-4 text-center">My Activity</h2>
                {loading ? (
                    <p className="text-gray-500 text-center">Loading...</p>
                ) : myActivity.length === 0 ? (
                    <p className="text-gray-500 text-center">No activity to show. Add your first entry!</p>
                ) : (
                    <div className="space-y-4">
                        {myActivity.map((activity) => (
                            <div key={activity.id} className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <p className="mt-2 text-sm text-gray-400">
                                    <span className="text-white font-bold">{activity.title}</span>
                                    {activity.timestampLeftOff && (
                                        <>
                                            {" "}• Left off at <span className="text-green-400">{activity.timestampLeftOff}</span>
                                        </>
                                    )}{" "}
                                    • Posted on{" "}
                                    {activity.timestampPosted
                                        ? new Date(activity.timestampPosted).toLocaleString()
                                        : "Unknown Date"}
                                </p>
                                <button
                                    onClick={() => handleDeleteActivity(activity.id)}
                                    className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                                >
                                    Delete
                                </button>
                                <div className="mt-4">
                                    <button
                                        onClick={() => handleLike(user.username, activity.id)}
                                        className={`px-4 py-2 rounded-lg ${activity.likes.includes(user.username)
                                                ? "bg-red-600 hover:bg-red-700"
                                                : "bg-blue-600 hover:bg-blue-700"
                                            } text-white`}
                                    >
                                        {activity.likes.includes(user.username) ? "Unlike" : "Like"} ({activity.likes.length})
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        value={comments[activity.id] || ""}
                                        onChange={(e) => handleCommentChange(activity.id, e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                                    />
                                    <button
                                        onClick={() => handleComment(user.username, activity.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mt-2"
                                    >
                                        Comment
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <strong className="text-white">Comments:</strong>
                                    {activity.comments.length === 0 ? (
                                        <p className="text-gray-500">No comments yet.</p>
                                    ) : (
                                        activity.comments.map((c, commentIndex) => (
                                            <div key={commentIndex} className="mt-2">
                                                <p className="text-sm text-gray-300">
                                                    <strong>{c.username}:</strong> {c.text}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(c.timestamp).toLocaleString()}
                                                </p>
                                                {c.username === user.username && (
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteComment(user.username, activity.id, commentIndex)
                                                        }
                                                        className="text-red-500 hover:text-red-700 text-xs mt-1"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-lg font-bold mb-4 text-center">Friends' Activity</h2>
                {loading ? (
                    <p className="text-gray-500 text-center">Loading...</p>
                ) : friendsActivity.length === 0 ? (
                    <p className="text-gray-500 text-center">No recent activity to show from your friends.</p>
                ) : (
                    <div className="space-y-4">
                        {friendsActivity.map((activity, index) => (
                            <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={activity.friendAvatar}
                                        alt={`${activity.friendName}'s avatar`}
                                        className="w-12 h-12 rounded-full cursor-pointer"
                                        onClick={() =>
                                            (window.location.href = `/friend/${activity.friendUsername}`)
                                        }
                                    />
                                    <div>
                                        <strong className="text-white">{activity.friendName}</strong>
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-gray-400">
                                    <span className="text-white font-bold">{activity.title}</span> • Left off at{" "}
                                    <span className="text-green-400">{activity.timestampLeftOff}</span> • Posted on{" "}
                                    {activity.timestampPosted
                                        ? new Date(activity.timestampPosted).toLocaleString()
                                        : "Unknown Date"}
                                </p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => handleLike(activity.friendUsername, activity.id)}
                                        className={`px-4 py-2 rounded-lg ${activity.likes.includes(user.username)
                                                ? "bg-red-600 hover:bg-red-700"
                                                : "bg-blue-600 hover:bg-blue-700"
                                            } text-white`}
                                    >
                                        {activity.likes.includes(user.username) ? "Unlike" : "Like"} ({activity.likes.length})
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="Write a comment..."
                                        value={comments[activity.id] || ""}
                                        onChange={(e) => handleCommentChange(activity.id, e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                                    />
                                    <button
                                        onClick={() => handleComment(activity.friendUsername, activity.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mt-2"
                                    >
                                        Comment
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <strong className="text-white">Comments:</strong>
                                    {activity.comments.length === 0 ? (
                                        <p className="text-gray-500">No comments yet.</p>
                                    ) : (
                                        activity.comments.map((c, commentIndex) => (
                                            <div key={commentIndex} className="mt-2">
                                                <p className="text-sm text-gray-300">
                                                    <strong>{c.username}:</strong> {c.text}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(c.timestamp).toLocaleString()}
                                                </p>
                                                {c.username === user.username && (
                                                    <button
                                                        onClick={() =>
                                                            handleDeleteComment(activity.friendUsername, activity.id, commentIndex)
                                                        }
                                                        className="text-red-500 hover:text-red-700 text-xs mt-1"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsActivityFeed;