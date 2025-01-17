import React, { useState, useEffect } from "react"; 
import { db } from "../firebaseConfig";
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";

const ChatPage = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const username = user?.username || "Guest";

    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(messages);
        });
        return () => unsubscribe(); 
    }, []);

    const sendMessage = async () => {
        if (newMessage.trim() === "") {
            console.error("Cannot send an empty message");
            return;
        }

        try {
            await addDoc(collection(db, "chats"), {
                text: newMessage,
                timestamp: serverTimestamp(),
                userId: user?.email || "guest", 
                userName: username,
            });
            setNewMessage(""); 
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="chat-container p-4">
            <div className="messages bg-gray-200 p-4 rounded overflow-auto h-96">
                {messages.map((message) => (
                    <div key={message.id} className="message mb-2">
                        <p>
                            <strong>{message.userName}:</strong> {message.text}
                        </p>
                    </div>
                ))}
            </div>
            <div className="message-input mt-4 flex items-center">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow p-2 border rounded"
                />
                <button
                    onClick={sendMessage}
                    className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatPage;
