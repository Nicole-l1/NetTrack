import { db } from '../firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
} from 'firebase/firestore';

// Collection reference
const usersCollection = collection(db, 'users');

/**
 * Create a new user in Firestore
 */
export const createUser = async (userData) => {
    try {
        const userDoc = doc(usersCollection, userData.username);
        await setDoc(userDoc, {
            ...userData,
            friends: [],
            friendRequests: [],
            activityFeed: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return { success: true, user: userData };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user by username
 */
export const getUserByUsername = async (username) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);

        if (userSnapshot.exists()) {
            return { success: true, user: { id: userSnapshot.id, ...userSnapshot.data() } };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error getting user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email) => {
    try {
        const q = query(usersCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { success: true, user: { id: userDoc.id, ...userDoc.data() } };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error getting user by email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if username exists
 */
export const checkUsernameExists = async (username) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);
        return userSnapshot.exists();
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
};

/**
 * Check if email exists
 */
export const checkEmailExists = async (email) => {
    try {
        const q = query(usersCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (username, updates) => {
    try {
        const userDoc = doc(usersCollection, username);
        await updateDoc(userDoc, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete user account
 */
export const deleteUser = async (username) => {
    try {
        const userDoc = doc(usersCollection, username);

        // Get user data first
        const userSnapshot = await getDoc(userDoc);
        if (!userSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userSnapshot.data();

        // Remove user from all friends' friend lists
        if (userData.friends && userData.friends.length > 0) {
            for (const friendUsername of userData.friends) {
                const friendDoc = doc(usersCollection, friendUsername);
                await updateDoc(friendDoc, {
                    friends: arrayRemove(username),
                    updatedAt: serverTimestamp(),
                });
            }
        }

        // Remove from friend requests
        const allUsersSnapshot = await getDocs(usersCollection);
        for (const userDoc of allUsersSnapshot.docs) {
            const user = userDoc.data();
            if (user.friendRequests && user.friendRequests.includes(username)) {
                await updateDoc(doc(usersCollection, userDoc.id), {
                    friendRequests: arrayRemove(username),
                    updatedAt: serverTimestamp(),
                });
            }
        }

        // Delete the user document
        await deleteDoc(userDoc);

        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send friend request
 */
export const sendFriendRequest = async (currentUsername, targetUsername) => {
    try {
        // Check if target user exists
        const targetDoc = doc(usersCollection, targetUsername);
        const targetSnapshot = await getDoc(targetDoc);

        if (!targetSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const targetData = targetSnapshot.data();

        // Check if already friends
        if (targetData.friends && targetData.friends.includes(currentUsername)) {
            return { success: false, error: 'Already friends' };
        }

        // Check if request already sent
        if (targetData.friendRequests && targetData.friendRequests.includes(currentUsername)) {
            return { success: false, error: 'Friend request already sent' };
        }

        // Add friend request
        await updateDoc(targetDoc, {
            friendRequests: arrayUnion(currentUsername),
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending friend request:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Accept friend request
 */
export const acceptFriendRequest = async (currentUsername, requestUsername) => {
    try {
        const currentUserDoc = doc(usersCollection, currentUsername);
        const requestUserDoc = doc(usersCollection, requestUsername);

        // Add to both friends lists
        await updateDoc(currentUserDoc, {
            friends: arrayUnion(requestUsername),
            friendRequests: arrayRemove(requestUsername),
            updatedAt: serverTimestamp(),
        });

        await updateDoc(requestUserDoc, {
            friends: arrayUnion(currentUsername),
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Reject friend request
 */
export const rejectFriendRequest = async (currentUsername, requestUsername) => {
    try {
        const currentUserDoc = doc(usersCollection, currentUsername);

        await updateDoc(currentUserDoc, {
            friendRequests: arrayRemove(requestUsername),
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Remove friend
 */
export const removeFriend = async (currentUsername, friendUsername) => {
    try {
        const currentUserDoc = doc(usersCollection, currentUsername);
        const friendUserDoc = doc(usersCollection, friendUsername);

        // Remove from both friends lists
        await updateDoc(currentUserDoc, {
            friends: arrayRemove(friendUsername),
            updatedAt: serverTimestamp(),
        });

        await updateDoc(friendUserDoc, {
            friends: arrayRemove(currentUsername),
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error removing friend:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all friends for a user
 */
export const getFriends = async (username) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);

        if (!userSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userSnapshot.data();
        const friendUsernames = userData.friends || [];

        // Fetch all friend data
        const friends = [];
        for (const friendUsername of friendUsernames) {
            const friendDoc = doc(usersCollection, friendUsername);
            const friendSnapshot = await getDoc(friendDoc);
            if (friendSnapshot.exists()) {
                friends.push({ id: friendSnapshot.id, ...friendSnapshot.data() });
            }
        }

        return { success: true, friends };
    } catch (error) {
        console.error('Error getting friends:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add activity to user's feed
 */
export const addActivity = async (username, activity) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);

        if (!userSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userSnapshot.data();
        const activityFeed = userData.activityFeed || [];

        activityFeed.push({
            ...activity,
            timestampPosted: new Date().toISOString(),
            likes: [],
            comments: [],
        });

        await updateDoc(userDoc, {
            activityFeed,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error adding activity:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update activity in user's feed
 */
export const updateActivity = async (username, activityId, updates) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);

        if (!userSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userSnapshot.data();
        const activityFeed = userData.activityFeed || [];

        const activityIndex = activityFeed.findIndex(a => a.id === activityId);
        if (activityIndex === -1) {
            return { success: false, error: 'Activity not found' };
        }

        activityFeed[activityIndex] = {
            ...activityFeed[activityIndex],
            ...updates,
        };

        await updateDoc(userDoc, {
            activityFeed,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating activity:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete activity from user's feed
 */
export const deleteActivity = async (username, activityId) => {
    try {
        const userDoc = doc(usersCollection, username);
        const userSnapshot = await getDoc(userDoc);

        if (!userSnapshot.exists()) {
            return { success: false, error: 'User not found' };
        }

        const userData = userSnapshot.data();
        const activityFeed = userData.activityFeed || [];

        const updatedFeed = activityFeed.filter(a => a.id !== activityId);

        await updateDoc(userDoc, {
            activityFeed: updatedFeed,
            updatedAt: serverTimestamp(),
        });

        return { success: true };
    } catch (error) {
        console.error('Error deleting activity:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all users (for search/discovery)
 */
export const getAllUsers = async () => {
    try {
        const querySnapshot = await getDocs(usersCollection);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, users };
    } catch (error) {
        console.error('Error getting all users:', error);
        return { success: false, error: error.message };
    }
};

export default {
    createUser,
    getUserByUsername,
    getUserByEmail,
    checkUsernameExists,
    checkEmailExists,
    updateUserProfile,
    deleteUser,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriends,
    addActivity,
    updateActivity,
    deleteActivity,
    getAllUsers,
};