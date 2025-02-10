import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Confirm from '../components/Confirm';
import { removeFriend, updateUserProfile, deleteUser as deleteUserFromDB, getUserByUsername } from '../helpers/userHelpers';

let defaultProfileIcon;
try {
    defaultProfileIcon = require('../assets/images/profile-icon.png');
} catch (e) {
    console.warn('Default profile icon not found');
    defaultProfileIcon = null;
}

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

const ProfilePage = ({ user, setUser }) => {
    const [showModal, setShowModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [avatar, setAvatar] = useState(user.avatar);
    const [favoriteGenres, setFavoriteGenres] = useState(user.favoriteGenres || []);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const genresList = [
        'Action & Adventure',
        'Anime',
        'Children & Family',
        'Classic',
        'Comedies',
        'Documentaries',
        'Dramas',
        'Horror',
        'Music',
        'Romantic',
        'Sci-fi & Fantasy',
        'Sports',
        'Thrillers',
        'TV Shows',
    ];

    useEffect(() => {
        // Load user data on mount
        const loadUserData = async () => {
            try {
                const result = await getUserByUsername(user.username);
                if (result.success) {
                    setFriends(result.user.friends || []);
                    setAvatar(result.user.avatar || user.avatar);
                    setFavoriteGenres(result.user.favoriteGenres || []);
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        };

        loadUserData();
    }, [user.username]);

    const handleLogout = () => {
        setUser(null);
        navigate('/');
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            const result = await deleteUserFromDB(user.username);
            if (result.success) {
                setUser(null);
                navigate('/');
            } else {
                alert('Failed to delete account: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert('An error occurred while deleting your account');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFriend = async (friendUsername) => {
        setLoading(true);
        try {
            const result = await removeFriend(user.username, friendUsername);
            if (result.success) {
                setFriends(friends.filter((username) => username !== friendUsername));
            } else {
                alert('Failed to remove friend: ' + result.error);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            alert('An error occurred while removing friend');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
                setAvatar(reader.result);
                await updateUserInDB({ avatar: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddGenre = async () => {
        if (selectedGenre && !favoriteGenres.includes(selectedGenre)) {
            const updatedGenres = [...favoriteGenres, selectedGenre];
            setFavoriteGenres(updatedGenres);
            await updateUserInDB({ favoriteGenres: updatedGenres });
            setSelectedGenre('');
        }
    };

    const handleRemoveGenre = async (genreToRemove) => {
        const updatedGenres = favoriteGenres.filter((genre) => genre !== genreToRemove);
        setFavoriteGenres(updatedGenres);
        await updateUserInDB({ favoriteGenres: updatedGenres });
    };

    const updateUserInDB = async (updates) => {
        try {
            const result = await updateUserProfile(user.username, updates);
            if (result.success) {
                // Update local user state
                setUser({ ...user, ...updates });
            } else {
                console.error('Failed to update profile:', result.error);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    };

    return (
        <div className="bg-black text-white min-h-screen p-6">
            {showModal && (
                <Confirm
                    message="Are you sure you want to delete your account? This action cannot be reversed."
                    onConfirm={handleDeleteAccount}
                    onCancel={() => setShowModal(false)}
                />
            )}

            <div className="flex items-center space-x-4 mb-6">
                <UserAvatar
                    avatar={avatar}
                    alt={`${user.name}'s avatar`}
                    size="80"
                    className="w-20 h-20 rounded-full border border-gray-300"
                    style={{
                        width: '80px',
                        height: '80px'
                    }}
                />
                <div>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-gray-600">{user.email}</p>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Change Avatar</h2>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={loading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-red-500 file:text-white hover:file:bg-red-600"
                />
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Favorite Genres</h2>
                <div className="flex flex-wrap space-x-2 mb-4">
                    {favoriteGenres.map((genre, index) => (
                        <span
                            key={index}
                            className="bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center"
                        >
                            {genre}
                            <button
                                onClick={() => handleRemoveGenre(genre)}
                                disabled={loading}
                                className="ml-2 text-white hover:text-gray-300"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex items-center space-x-2">
                    <select
                        value={selectedGenre}
                        onChange={(e) => setSelectedGenre(e.target.value)}
                        disabled={loading}
                        className="border border-black rounded p-2 bg-gray-800"
                    >
                        <option value="">Select a genre</option>
                        {genresList
                            .filter((genre) => !favoriteGenres.includes(genre))
                            .map((genre, index) => (
                                <option key={index} value={genre}>
                                    {genre}
                                </option>
                            ))}
                    </select>
                    <button
                        onClick={handleAddGenre}
                        disabled={!selectedGenre || loading}
                        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Your Friends</h2>
                {friends.length === 0 ? (
                    <p className="text-gray-600">You have no friends added yet.</p>
                ) : (
                    <ul className="space-y-4">
                        {friends.map((friendUsername) => (
                            <li
                                key={friendUsername}
                                className="bg-gray-800 p-4 rounded shadow flex justify-between items-center"
                            >
                                <div>
                                    <strong>
                                        <a
                                            href={`/friend/${friendUsername}`}
                                            className="text-white hover:underline"
                                        >
                                            {friendUsername}
                                        </a>
                                    </strong>
                                </div>
                                <button
                                    onClick={() => handleRemoveFriend(friendUsername)}
                                    disabled={loading}
                                    className="bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 disabled:bg-red-300"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="space-x-4">
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
                >
                    Logout
                </button>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={loading}
                    className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800 disabled:bg-gray-600"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;