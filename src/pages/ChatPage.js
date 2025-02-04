import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebaseConfig";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    where,
    serverTimestamp,
} from "firebase/firestore";

// Import local icons with fallback
let globalIconImage;
let groupIconImage;
let defaultProfileIcon;

try {
    globalIconImage = require('../assets/images/global-icon.png');
} catch (e) {
    console.warn('Global icon not found, using fallback');
    globalIconImage = null;
}

try {
    groupIconImage = require('../assets/images/group-icon.png');
} catch (e) {
    console.warn('Group icon not found, using fallback');
    groupIconImage = null;
}

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

const ChatPage = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeChat, setActiveChat] = useState("global");
    const [chatType, setChatType] = useState("global");
    const [userFriends, setUserFriends] = useState([]);
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [directMessages, setDirectMessages] = useState([]);
    const [groupChats, setGroupChats] = useState([]);
    const [newGroupName, setNewGroupName] = useState("");
    const [loading, setLoading] = useState(true);
    const [userAvatars, setUserAvatars] = useState({}); // Store all user avatars
    const messagesEndRef = useRef(null);

    const username = user?.username || "Guest";
    const currentUserAvatar = user?.avatar || "https://via.placeholder.com/150";

    useEffect(() => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const avatarMap = {};
        users.forEach(u => {
            avatarMap[u.username] = u.avatar || "https://via.placeholder.com/150";
        });
        setUserAvatars(avatarMap);
    }, []);

    useEffect(() => {
        const users = JSON.parse(localStorage.getItem("users")) || [];
        const currentUser = users.find((u) => u.username === username);
        if (currentUser && currentUser.friends) {
            setUserFriends(currentUser.friends);
        }
    }, [username]);

    useEffect(() => {
        if (!user) return;

        // Fetch Direct Messages - get unique conversations
        const dmQuery = query(
            collection(db, "chats"),
            where("type", "==", "dm"),
            where("participants", "array-contains", username)
        );

        const unsubscribeDM = onSnapshot(dmQuery, (snapshot) => {
            const dmChats = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const otherUser = data.participants?.find((p) => p !== username);
                if (otherUser && !dmChats[otherUser]) {
                    dmChats[otherUser] = {
                        id: doc.id,
                        lastMessage: data.text || "",
                        timestamp: data.timestamp,
                    };
                }
            });
            setDirectMessages(Object.entries(dmChats));
        });

        // Fetch Group Chats - get unique groups
        const groupQuery = query(
            collection(db, "chats"),
            where("type", "==", "group"),
            where("participants", "array-contains", username)
        );

        const unsubscribeGroup = onSnapshot(groupQuery, (snapshot) => {
            const groups = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.groupId && !groups[data.groupId]) {
                    groups[data.groupId] = {
                        id: data.groupId,
                        name: data.groupName || "Unnamed Group",
                        participants: data.participants || [],
                        lastMessage: data.text || "",
                        timestamp: data.timestamp,
                    };
                }
            });
            setGroupChats(Object.values(groups));
        });

        return () => {
            unsubscribeDM();
            unsubscribeGroup();
        };
    }, [user, username]);

    // Load messages based on active chat
    useEffect(() => {
        setLoading(true);
        setMessages([]);

        let q;

        try {
            if (activeChat === "global") {
                // Global chat - simpler query without orderBy initially
                q = query(
                    collection(db, "chats"),
                    where("type", "==", "global")
                );
            } else if (activeChat.startsWith("dm-")) {
                // Direct message
                const otherUser = activeChat.replace("dm-", "");
                const participants = [username, otherUser].sort();

                q = query(
                    collection(db, "chats"),
                    where("type", "==", "dm"),
                    where("participants", "==", participants)
                );
            } else if (activeChat.startsWith("group-")) {
                // Group chat
                const groupId = activeChat.replace("group-", "");
                q = query(
                    collection(db, "chats"),
                    where("type", "==", "group"),
                    where("groupId", "==", groupId)
                );
            }

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const msgs = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    // Sort messages by timestamp manually
                    msgs.sort((a, b) => {
                        const timeA = a.timestamp?.toDate?.() || new Date(0);
                        const timeB = b.timestamp?.toDate?.() || new Date(0);
                        return timeA - timeB;
                    });

                    setMessages(msgs);
                    setLoading(false);
                },
                (error) => {
                    console.error("Error loading messages:", error);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (error) {
            console.error("Error setting up query:", error);
            setLoading(false);
        }
    }, [activeChat, username]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        if (newMessage.trim() === "") return;

        try {
            const messageData = {
                text: newMessage,
                timestamp: serverTimestamp(),
                userId: user?.email || "guest",
                userName: username,
            };

            if (activeChat === "global") {
                messageData.type = "global";
            } else if (activeChat.startsWith("dm-")) {
                const otherUser = activeChat.replace("dm-", "");
                messageData.type = "dm";
                messageData.participants = [username, otherUser].sort();
            } else if (activeChat.startsWith("group-")) {
                const groupId = activeChat.replace("group-", "");
                const group = groupChats.find((g) => g.id === groupId);
                messageData.type = "group";
                messageData.groupId = groupId;
                messageData.groupName = group?.name || "Unnamed Group";
                messageData.participants = group?.participants || [username];
            }

            await addDoc(collection(db, "chats"), messageData);
            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message. Check console for details.");
        }
    };

    const startDirectMessage = async (friendUsername) => {
        setActiveChat(`dm-${friendUsername}`);
        setChatType("dm");
        setShowNewChat(false);
    };

    const createGroupChat = async () => {
        if (selectedFriends.length === 0 || !newGroupName.trim()) {
            alert("Please select friends and enter a group name");
            return;
        }

        try {
            const groupId = `group_${Date.now()}`;
            const participants = [username, ...selectedFriends].sort();

            const messageData = {
                type: "group",
                groupId: groupId,
                groupName: newGroupName,
                participants: participants,
                text: `${username} created the group`,
                timestamp: serverTimestamp(),
                userId: user?.email || "guest",
                userName: "System",
            };

            await addDoc(collection(db, "chats"), messageData);

            setActiveChat(`group-${groupId}`);
            setChatType("group");
            setShowNewChat(false);
            setSelectedFriends([]);
            setNewGroupName("");
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getChatTitle = () => {
        if (activeChat === "global") return "Global Chat";
        if (activeChat.startsWith("dm-")) return activeChat.replace("dm-", "");
        if (activeChat.startsWith("group-")) {
            const groupId = activeChat.replace("group-", "");
            const group = groupChats.find((g) => g.id === groupId);
            return group?.name || "Group Chat";
        }
        return "Chat";
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return "";
        }
    };

    const getUserAvatar = (username) => {
        return userAvatars[username] || "https://via.placeholder.com/150";
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <div className="w-1/4 bg-gray-800 border-r border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Chats</h2>
                </div>

                {/* Global Chat */}
                <div
                    onClick={() => {
                        setActiveChat("global");
                        setChatType("global");
                    }}
                    className={`p-4 cursor-pointer hover:bg-gray-700 border-b border-gray-700 ${activeChat === "global" ? "bg-gray-700" : ""
                        }`}
                >
                    <div className="flex items-center space-x-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                                width: '40px',
                                height: '40px',
                                minWidth: '40px',
                                minHeight: '40px',
                                maxWidth: '40px',
                                maxHeight: '40px',
                                backgroundColor: '#A8D5FF', // Pastel blue
                                border: '2px solid #7AB8E8'
                            }}
                        >
                            {globalIconImage ? (
                                <img
                                    src={globalIconImage}
                                    alt="Global"
                                    style={{ width: '20px', height: '20px' }}
                                />
                            ) : (
                                <span style={{ fontSize: '20px' }}>🌍</span>
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">Global Chat</p>
                            <p className="text-sm text-gray-400">Everyone</p>
                        </div>
                    </div>
                </div>

                {/* Direct Messages Section */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-400">Direct Messages</h3>
                        <button
                            onClick={() => {
                                setShowNewChat(true);
                                setChatType("dm");
                            }}
                            className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                            + New
                        </button>
                    </div>

                    {directMessages.length === 0 && (
                        <p className="text-sm text-gray-500 p-4">No direct messages yet</p>
                    )}

                    {directMessages.map(([friend, data]) => (
                        <div
                            key={friend}
                            onClick={() => startDirectMessage(friend)}
                            className={`p-4 cursor-pointer hover:bg-gray-700 border-b border-gray-700 ${activeChat === `dm-${friend}` ? "bg-gray-700" : ""
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <UserAvatar
                                    avatar={getUserAvatar(friend)}
                                    alt={friend}
                                    size="40"
                                    className="w-10 h-10 rounded-full object-cover border-2 border-green-500"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        minWidth: '40px',
                                        minHeight: '40px',
                                        maxWidth: '40px',
                                        maxHeight: '40px'
                                    }}
                                />
                                <div className="flex-1">
                                    <p className="font-semibold">{friend}</p>
                                    <p className="text-sm text-gray-400 truncate">
                                        {data.lastMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Group Chats Section */}
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center mt-4">
                        <h3 className="font-semibold text-gray-400">Group Chats</h3>
                        <button
                            onClick={() => {
                                setShowNewChat(true);
                                setChatType("group");
                            }}
                            className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                            + New
                        </button>
                    </div>

                    {groupChats.length === 0 && (
                        <p className="text-sm text-gray-500 p-4">No group chats yet</p>
                    )}

                    {groupChats.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => {
                                setActiveChat(`group-${group.id}`);
                                setChatType("group");
                            }}
                            className={`p-4 cursor-pointer hover:bg-gray-700 border-b border-gray-700 ${activeChat === `group-${group.id}` ? "bg-gray-700" : ""
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                {/* Group icon with pastel red background */}
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        minWidth: '40px',
                                        minHeight: '40px',
                                        maxWidth: '40px',
                                        maxHeight: '40px',
                                        backgroundColor: '#FFB3B3', // Pastel red
                                        border: '2px solid #FF8A8A'
                                    }}
                                >
                                    {groupIconImage ? (
                                        <img
                                            src={groupIconImage}
                                            alt="Group"
                                            style={{ width: '20px', height: '20px' }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '20px' }}>👥</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{group.name}</p>
                                    <p className="text-sm text-gray-400">
                                        {group.participants.length} members
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Chat Header */}
                <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center space-x-3">
                    {/* Header Avatar */}
                    {activeChat === "global" ? (
                        <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                                width: '48px',
                                height: '48px',
                                minWidth: '48px',
                                minHeight: '48px',
                                maxWidth: '48px',
                                maxHeight: '48px',
                                backgroundColor: '#A8D5FF', // Pastel blue
                                border: '2px solid #7AB8E8'
                            }}
                        >
                            {globalIconImage ? (
                                <img
                                    src={globalIconImage}
                                    alt="Global"
                                    style={{ width: '24px', height: '24px' }}
                                />
                            ) : (
                                <span style={{ fontSize: '24px' }}>🌍</span>
                            )}
                        </div>
                    ) : activeChat.startsWith("dm-") ? (
                        <UserAvatar
                            avatar={getUserAvatar(activeChat.replace("dm-", ""))}
                            alt="User"
                            size="48"
                            className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                            style={{
                                width: '48px',
                                height: '48px',
                                minWidth: '48px',
                                minHeight: '48px',
                                maxWidth: '48px',
                                maxHeight: '48px'
                            }}
                        />
                    ) : (
                        <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                                width: '48px',
                                height: '48px',
                                minWidth: '48px',
                                minHeight: '48px',
                                maxWidth: '48px',
                                maxHeight: '48px',
                                backgroundColor: '#FFB3B3', // Pastel red
                                border: '2px solid #FF8A8A'
                            }}
                        >
                            {groupIconImage ? (
                                <img
                                    src={groupIconImage}
                                    alt="Group"
                                    style={{ width: '24px', height: '24px' }}
                                />
                            ) : (
                                <span style={{ fontSize: '24px' }}>👥</span>
                            )}
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-bold">{getChatTitle()}</h2>
                        {activeChat.startsWith("group-") && (
                            <p className="text-sm text-gray-400">
                                {groupChats
                                    .find((g) => g.id === activeChat.replace("group-", ""))
                                    ?.participants.join(", ")}
                            </p>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">Loading messages...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex items-start space-x-2 ${message.userName === username ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {/* Show avatar for other users' messages */}
                                {message.userName !== username && (
                                    <UserAvatar
                                        avatar={getUserAvatar(message.userName)}
                                        alt={message.userName}
                                        size="32"
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            minWidth: '32px',
                                            minHeight: '32px',
                                            maxWidth: '32px',
                                            maxHeight: '32px'
                                        }}
                                    />
                                )}

                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.userName === username
                                        ? "bg-blue-600"
                                        : "bg-gray-700"
                                        }`}
                                >
                                    {message.userName !== username && (
                                        <p className="text-xs text-gray-300 mb-1 font-semibold">
                                            {message.userName}
                                        </p>
                                    )}
                                    <p className="break-words">{message.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>

                                {/* Show avatar for current user's messages */}
                                {message.userName === username && (
                                    <UserAvatar
                                        avatar={currentUserAvatar}
                                        alt="You"
                                        size="32"
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            minWidth: '32px',
                                            minHeight: '32px',
                                            maxWidth: '32px',
                                            maxHeight: '32px'
                                        }}
                                    />
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="bg-gray-800 p-4 border-t border-gray-700">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your message..."
                            className="flex-1 p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={sendMessage}
                            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>

            {/* New Chat Modal */}
            {showNewChat && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {chatType === "dm" ? "New Direct Message" : "Create Group Chat"}
                        </h3>

                        {chatType === "group" && (
                            <input
                                type="text"
                                placeholder="Group Name"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="w-full p-2 mb-4 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        )}

                        {userFriends.length === 0 ? (
                            <p className="text-gray-400 mb-4">
                                You don't have any friends yet. Add friends first!
                            </p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {userFriends.map((friend) => (
                                    <div
                                        key={friend}
                                        onClick={() => {
                                            if (chatType === "dm") {
                                                startDirectMessage(friend);
                                            } else {
                                                setSelectedFriends((prev) =>
                                                    prev.includes(friend)
                                                        ? prev.filter((f) => f !== friend)
                                                        : [...prev, friend]
                                                );
                                            }
                                        }}
                                        className={`p-3 rounded cursor-pointer transition-colors flex items-center space-x-3 ${selectedFriends.includes(friend)
                                            ? "bg-blue-600"
                                            : "bg-gray-700 hover:bg-gray-600"
                                            }`}
                                    >
                                        <UserAvatar
                                            avatar={getUserAvatar(friend)}
                                            alt={friend}
                                            size="32"
                                            className="w-8 h-8 rounded-full object-cover"
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                minWidth: '32px',
                                                minHeight: '32px',
                                                maxWidth: '32px',
                                                maxHeight: '32px'
                                            }}
                                        />
                                        <p>{friend}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex space-x-2">
                            {chatType === "group" && userFriends.length > 0 && (
                                <button
                                    onClick={createGroupChat}
                                    className="flex-1 bg-blue-600 py-2 rounded hover:bg-blue-700 font-semibold"
                                >
                                    Create Group
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowNewChat(false);
                                    setSelectedFriends([]);
                                    setNewGroupName("");
                                }}
                                className="flex-1 bg-gray-600 py-2 rounded hover:bg-gray-700 font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatPage;