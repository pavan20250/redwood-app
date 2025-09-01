"use client";

import React, { useEffect, useState } from "react";
import { Client, Databases, Account, Models, Query } from "appwrite";
import { PROJECT_ID, API_ENDPOINT, DATABASE_ID } from "@/appwrite/config";
import { RealtimeResponseEvent } from 'appwrite';

const MESSAGES_COLLECTION_ID = "6770e11a0008b9a32f6c";

const client = new Client();
client.setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);
const databases = new Databases(client);
const account = new Account(client);

const SendMessage: React.FC = () => {
  const [users, setUsers] = useState<Models.Document[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState<string>("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Models.Document[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: Set<string> }>({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // helper function for date formatting
  const formatMessageDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // helper function to group messages by date
  const groupMessagesByDate = (messages: Models.Document[]) => {
    const groups: { [key: string]: Models.Document[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  // message container ref for scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Update useEffect to scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    account.get().then(
      (user) => {
        setCurrentUserEmail(user.email);
      },
      (err) => {
        console.error("Error fetching current user:", err);
        setError("Failed to fetch current user.");
      }
    );

    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data.users);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to fetch users.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchUsers();

    let isSubscribed = true;
    let unsubscribe: (() => void) | null = null;

    const setupSubscription = async () => {
      try {
        unsubscribe = client.subscribe(
          `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
          (response: RealtimeResponseEvent<Models.Document>) => {
            if (!isSubscribed) return;
            
            if (response.events.includes("databases.*.collections.*.documents.*.create")) {
              const newMessage = response.payload;
              if (newMessage.receiverEmail === currentUserEmail) {
                setUnreadMessages((prev) => {
                  const newUnreadMessages = { ...prev };
                  if (!newUnreadMessages[newMessage.senderEmail]) {
                    newUnreadMessages[newMessage.senderEmail] = new Set();
                  }
                  newUnreadMessages[newMessage.senderEmail].add(newMessage.$id);
                  return newUnreadMessages;
                });
                if (selectedReceiver === newMessage.senderEmail) {
                  setMessages((prevMessages) => [...prevMessages, newMessage]);
                }
              }
            }
          }
        );
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error unsubscribing:", error);
        }
      }
    };
  }, [currentUserEmail, selectedReceiver]);

  const fetchMessages = async (receiverEmail: string) => {
    if (!currentUserEmail) return;

    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.or([
            Query.and([
              Query.equal("senderEmail", currentUserEmail),
              Query.equal("receiverEmail", receiverEmail)
            ]),
            Query.and([
              Query.equal("senderEmail", receiverEmail),
              Query.equal("receiverEmail", currentUserEmail)
            ])
          ]),
          Query.orderAsc("timestamp")
        ]
      );
      setMessages(response.documents);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to fetch messages.");
    }
  };

  const handleSelectUser = (email: string) => {
    setSelectedReceiver(email);
    fetchMessages(email);
  };

  const handleSendMessage = async () => {
    if (!selectedReceiver || !messageContent || !currentUserEmail) {
      setError("Please select a receiver and enter a message.");
      return;
    }

    try {
      const newMessage = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        "unique()",
        {
          senderEmail: currentUserEmail,
          receiverEmail: selectedReceiver,
          content: messageContent,
          timestamp: new Date().toISOString(),
        }
      );

      setSuccessMessage("Message sent successfully!");
      setMessageContent("");
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message.");
    }
  };

  const markMessagesAsRead = () => {
    if (selectedReceiver && unreadMessages[selectedReceiver]) {
      setUnreadMessages((prev) => {
        const newUnreadMessages = { ...prev };
        delete newUnreadMessages[selectedReceiver];
        return newUnreadMessages;
      });
    }
  };

  // Helper to get first char of name or fallback
  const getAvatarChar = (name: string | undefined, email: string | undefined) => {
    if (name && name.length > 0) return name.charAt(0).toUpperCase();
    if (email && email.length > 0) return email.charAt(0).toUpperCase();
    return "?";
  };

  return (
    <div className="flex h-[calc(100vh-0.1rem)] bg-[#f0f2f5] -mt-7">
      {/* Left sidebar - Contacts */}
      <div className="w-[30%] border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white">

            </div>
            <span className="font-medium">Team Chats</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2">
          <div className="bg-[#f0f2f5] rounded-lg px-4 py-2">
            <input 
              type="text" 
              placeholder="Search or start new chat"
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto">
          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500">Loading users...</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.$id}
                onClick={() => handleSelectUser(user.email)}
                className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] relative ${
                  selectedReceiver === user.email ? 'bg-[#f0f2f5]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xl font-bold text-white">
                  {getAvatarChar(user.name, user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium truncate">{user.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                {unreadMessages[user.email] && unreadMessages[user.email].size > 0 && (
                  <span className="w-5 h-5 bg-[#25D366] text-white rounded-full flex items-center justify-center text-xs">
                    {unreadMessages[user.email].size}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right side - Chat area */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {selectedReceiver ? (
          <>
            {/* Chat header */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center space-x-3 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white">
                {
                  getAvatarChar(
                    users.find(u => u.email === selectedReceiver)?.name,
                    selectedReceiver
                  )
                }
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{selectedReceiver}</h3>
                <p className="text-xs text-gray-500">online</p>
              </div>
            </div>
            {/* Messages area */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              style={{
                backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABoSURBVDiNY/z//z8DNQETlKYZGBlJN5CRkZGBiYkJQyybPgYyMjIyMDMzYxVnxGYgIyMjAzMzM1SQeC9TNfCpGvjkBzIy4M1DBAMZqZr5mJiYGP7//09YITF5+D8D6eUhIyMjVcsUYgAAUdqVHx8zU9QAAAAASUVORK5CYII=")`,
                backgroundRepeat: 'repeat'
              }}
              onScroll={markMessagesAsRead}
            >
              <div className="space-y-4">
                {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex justify-center">
                      <div className="bg-[#E1F2D7] px-3 py-1 rounded-lg text-sm text-gray-600 shadow-sm">
                        {formatMessageDate(new Date(date))}
                      </div>
                    </div>
                    {dateMessages.map((message) => (
                      <div
                        key={message.$id}
                        className={`flex ${message.senderEmail === currentUserEmail ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[65%] break-words rounded-lg px-4 py-2 ${
                            message.senderEmail === currentUserEmail
                              ? 'bg-[#dcf8c6]'
                              : 'bg-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-[11px] text-gray-500 text-right mt-1">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-end space-x-3">
              <div className="flex-1 bg-white rounded-lg px-4 py-2">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type a message"
                  className="w-full resize-none outline-none text-sm max-h-32"
                  rows={1}
                  style={{ height: '40px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="bg-[#25D366] text-white p-3 rounded-full hover:bg-[#1fa855] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          // Empty state when no chat is selected
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center text-gray-500 max-w-md p-6">
              <div className="relative w-32 h-32 mx-auto mb-8">
                {/* Main message circle */}
                <div className="absolute inset-0 bg-[#25D366] bg-opacity-10 rounded-full flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-16 w-16 text-[#25D366]" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#25D366] mb-3">Select a user from the list to begin a conversation</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendMessage;
