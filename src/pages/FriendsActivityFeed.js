import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

const FriendsActivityFeed = ({ user }) => {
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
    const location = useLocation();

    const fetchUsersFromLocalStorage = () => {
        return JSON.parse(localStorage.getItem("users")) || [];
    };

    const saveUsersToLocalStorage = (users) => {
        localStorage.setItem("users", JSON.stringify(users));
    };

    const fetchActivities = () => {
        const users = fetchUsersFromLocalStorage();
        const currentUser = users.find((u) => u.username === user.username);

        if (!currentUser) {
            setFriendsActivity([]);
            setMyActivity([]);
            return;
        }

        setMyActivity(currentUser.activityFeed || []);

        const friends = currentUser.friends
            .map((friendUsername) => users.find((u) => u.username === friendUsername))
            .filter(Boolean);

        const friendsFeed = friends.flatMap((friend) =>
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
    };

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

            console.log("Fetched Seasons:", data.seasons); 

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
        console.log("Selected Title:", title);

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

    const handleAddActivity = () => {
        if (!selectedTitle || !timestamp || (selectedTitle.media_type === "tv" && (!selectedSeason || !selectedEpisode))) {
            alert("Please fill in all required fields.");
            return;
        }

        const newActivity = {
            id: Date.now(), 
            title: selectedTitle.name || selectedTitle.title,
            mediaType: selectedTitle.media_type,
            timestampLeftOff: timestamp,
            timestampPosted: new Date().toISOString(),
            likes: [],
            comments: [],
            ...(selectedTitle.media_type === "tv" && {
                season: selectedSeason,
                episode: selectedEpisode,
            }),
        };

        const users = fetchUsersFromLocalStorage();
        const currentUser = users.find((u) => u.username === user.username);

        if (currentUser) {
            currentUser.activityFeed = currentUser.activityFeed || [];
            currentUser.activityFeed.push(newActivity);

            saveUsersToLocalStorage(users);
            fetchActivities(); 
        }

        setQuery("");
        setSearchResults([]);
        setSelectedTitle(null);
        setTimestamp("");
        setSelectedSeason(null);
        setSelectedEpisode(null);
    };

    const handleLike = (friendUsername, activityId) => {
        const users = fetchUsersFromLocalStorage();
        const friend = users.find((u) => u.username === friendUsername);

        if (friend) {
            const activity = friend.activityFeed.find((a) => a.id === activityId);
            if (activity) {
                const isLiked = activity.likes.includes(user.username);
                activity.likes = isLiked
                    ? activity.likes.filter((u) => u !== user.username)
                    : [...activity.likes, user.username];

                saveUsersToLocalStorage(users);
                fetchActivities();
            }
        }
    };

    const handleCommentChange = (activityId, value) => {
        setComments((prevComments) => ({
            ...prevComments,
            [activityId]: value,
        }));
    };

    const handleComment = (friendUsername, activityId) => {
        const commentText = comments[activityId]?.trim();
        if (!commentText) return;

        const users = fetchUsersFromLocalStorage();
        const friend = users.find((u) => u.username === friendUsername);

        if (friend) {
            const activity = friend.activityFeed.find((a) => a.id === activityId);
            if (activity) {
                activity.comments.push({
                    username: user.username,
                    text: commentText,
                    timestamp: new Date().toISOString(),
                });

                saveUsersToLocalStorage(users);
                fetchActivities();
                setComments((prevComments) => ({
                    ...prevComments,
                    [activityId]: "",
                }));
            }
        }
    };

    const handleDeleteComment = (friendUsername, activityId, commentIndex) => {
        const users = fetchUsersFromLocalStorage();
        const friend = users.find((u) => u.username === friendUsername);

        if (friend) {
            const activity = friend.activityFeed.find((a) => a.id === activityId);
            if (activity) {
                activity.comments.splice(commentIndex, 1);

                saveUsersToLocalStorage(users);
                fetchActivities();
            }
        }
    };

    useEffect(() => {
        const syncData = () => fetchActivities();
        window.addEventListener("storage", syncData);

        return () => {
            window.removeEventListener("storage", syncData);
        };
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [user, location.pathname]);

    return (
        <div className="bg-black text-white p-6 min-h-screen">
            <h1 className="text-2xl font-bold mb-6 text-center">Activity</h1>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg font-bold mb-4">Add Activity</h2>
                <input
                    type="text"
                    placeholder="Search Netflix title"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full px-4 py-2 mb-4 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                />
                <button
                    onClick={() => searchNetflixTitles(query)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-4 w-full"
                >
                    Search
                </button>
                <ul className="bg-gray-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                    {searchResults.map((result) => (
                        <li
                            key={result.id}
                            onClick={() => handleTitleSelection(result)}
                            className="cursor-pointer hover:bg-gray-600 p-2 rounded-lg text-white"
                        >
                            {result.title || result.name} ({result.media_type})
                        </li>
                    ))}
                </ul>
                {selectedTitle && (
                    <>
                        <p className="mt-4 text-sm text-gray-400">
                            Selected: <span className="text-white">{selectedTitle.title || selectedTitle.name}</span>
                        </p>
                        {selectedTitle.media_type === "tv" && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-400">Select Season:</label>
                                <select
                                    value={selectedSeason || ""}
                                    onChange={(e) => setSelectedSeason(e.target.value)}
                                    className="w-full px-4 py-2 mt-2 border border-gray-700 rounded-lg text-black"
                                >
                                    <option value="" disabled>
                                        Select a Season
                                    </option>
                                    {seasons.map((season) => (
                                        <option key={season.seasonNumber} value={season.seasonNumber}>
                                            Season {season.seasonNumber} ({season.episodeCount} episodes)
                                        </option>
                                    ))}
                                </select>

                                {selectedSeason && (
                                    <>
                                        <label className="block text-sm font-medium text-gray-400 mt-4">Select Episode:</label>
                                        <select
                                            value={selectedEpisode || ""}
                                            onChange={(e) => setSelectedEpisode(e.target.value)}
                                            className="w-full px-4 py-2 mt-2 border border-gray-700 rounded-lg text-black"
                                        >
                                            <option value="" disabled>
                                                Select an Episode
                                            </option>
                                            {Array.from(
                                                {
                                                    length: seasons.find(
                                                        (s) => s.seasonNumber === parseInt(selectedSeason)
                                                    ).episodeCount,
                                                },
                                                (_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        Episode {i + 1}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
                <input
                    type="text"
                    placeholder="Timestamp (e.g., 01:45:30)"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full px-4 py-2 mt-4 border border-gray-700 rounded-lg focus:ring focus:ring-blue-500 text-black"
                />
                <button
                    onClick={handleAddActivity}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mt-4 w-full"
                >
                    Add Activity
                </button>
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-bold mb-4 text-center">My Activity</h2>
                {myActivity.length === 0 ? (
                    <p className="text-gray-500 text-center">You have not logged any activities yet.</p>
                ) : (
                    <div className="space-y-4">
                        {myActivity.map((activity, index) => (
                            <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <p className="text-sm text-gray-400">
                                    <span className="text-white font-bold">{activity.title}</span>{" "}
                                    {activity.mediaType === "tv" && activity.season && activity.episode ? (
                                        <>
                                            • Left off at Season {activity.season}, Ep. {activity.episode} at{" "}
                                            <span className="text-green-400">{activity.timestampLeftOff}</span>
                                        </>
                                    ) : (
                                        <>
                                            • Left off at <span className="text-green-400">{activity.timestampLeftOff}</span>
                                        </>
                                    )}{" "}
                                    • Posted on{" "}
                                    {activity.timestampPosted
                                        ? new Date(activity.timestampPosted).toLocaleString()
                                        : "Unknown Date"}
                                </p>
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
                {friendsActivity.length === 0 ? (
                    <p className="text-gray-500 text-center">No recent activity to show from your friends.</p>
                ) : (
                    <div className="space-y-4">
                        {friendsActivity.map((activity, index) => (
                            <div key={index} className="bg-gray-800 p-6 rounded-lg shadow-md">
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={activity.friendAvatar}
                                        alt={`${activity.friendName}'s avatar`}
                                        className="w-12 h-12 rounded-full"
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
                                            <div key={commentIndex} className="mt
-2">
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
