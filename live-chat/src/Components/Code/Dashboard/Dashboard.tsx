import '../../Style/Dashboard style/Dashboard.css';
import { useDashboard } from '../../../hooks/Dashboard/useDashboard';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
    const navigate = useNavigate();
    const {
        friends,
        selectedFriend,
        showSidebar,
        messages,
        messageInput,
        setMessageInput,
        friendRequests,
        notifications,
        showAddFriend,
        setShowAddFriend,
        showFriendRequests,
        setShowFriendRequests,
        showMiniProfile,
        setShowMiniProfile,
        showMoreOptions,
        setShowMoreOptions,
        showBlockConfirm,
        addFriendInput,
        setAddFriendInput,
        unreadCount,
        currentUser,
        messagesEndRef,
        handleSendMessage,
        handleAddFriend,
        handleAcceptFriendRequest,
        handleRejectFriendRequest,
        handleMarkNotificationAsRead,
        handleMarkAllNotificationsAsRead,
        handleFriendClick,
        handleBackToSidebar,
        handleDeleteChat,
        handleBlockUser,
        confirmBlockUser,
        cancelBlockUser
    } = useDashboard();

    const moreOptionsRef = useRef<HTMLDivElement>(null);

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreOptionsRef.current && !moreOptionsRef.current.contains(event.target as Node)) {
                setShowMoreOptions(false);
            }
        };

        if (showMoreOptions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMoreOptions, setShowMoreOptions]);

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${showSidebar ? 'show' : 'hide'}`}>
                {/* Mini Profile View */}
                <div className="mini-profile-section">
                    <div 
                        className="mini-profile-header"
                        onClick={() => setShowMiniProfile(!showMiniProfile)}
                    >
                        <div className="mini-profile-avatar">
                            {currentUser.avatar ? (
                                <img src={currentUser.avatar} alt={currentUser.name} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {(currentUser.name || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="online-indicator"></span>
                        </div>
                        <div className="mini-profile-info">
                            <h3 className="mini-profile-name">{currentUser.name || 'User'}</h3>
                            <p className="mini-profile-status">
                                {currentUser.statusMessage || currentUser.status || 'Offline'}
                            </p>
                        </div>
                        <button className="profile-toggle-btn">
                            {showMiniProfile ? '▼' : '▲'}
                        </button>
                    </div>
                    {showMiniProfile && (
                        <div className="mini-profile-details">
                            {currentUser.username && (
                                <p><strong>Username:</strong> @{currentUser.username}</p>
                            )}
                            {currentUser.statusMessage && (
                                <p><strong>Status:</strong> {currentUser.statusMessage}</p>
                            )}
                            {currentUser.bio && (
                                <p className="mini-profile-bio"><strong>Bio:</strong> {currentUser.bio}</p>
                            )}
                            <button 
                                className="view-full-profile-btn"
                                onClick={() => navigate('/profile-full')}
                            >
                                View Full Profile
                            </button>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="sidebar-actions">
                    <button 
                        className="action-btn add-friend-btn"
                        onClick={() => {
                            setShowAddFriend(!showAddFriend);
                            setShowFriendRequests(false);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Friend
                    </button>
                    <button 
                        className="action-btn friend-requests-btn"
                        onClick={() => {
                            setShowFriendRequests(!showFriendRequests);
                            setShowAddFriend(false);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Friend Requests
                        {friendRequests.length > 0 && (
                            <span className="badge">{friendRequests.length}</span>
                        )}
                    </button>
                    <button 
                        className="action-btn notifications-btn"
                        onClick={() => handleMarkAllNotificationsAsRead()}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        Notifications
                        {unreadCount > 0 && (
                            <span className="badge">{unreadCount}</span>
                        )}
                    </button>
                </div>

                {/* Add Friend Form */}
                {showAddFriend && (
                    <div className="add-friend-form">
                        <form onSubmit={handleAddFriend}>
                            <input
                                type="text"
                                placeholder="Enter username or email"
                                value={addFriendInput}
                                onChange={(e) => setAddFriendInput(e.target.value)}
                                className="add-friend-input"
                            />
                            <div className="form-buttons">
                                <button type="submit" className="submit-btn">Add</button>
                                <button 
                                    type="button" 
                                    className="cancel-btn"
                                    onClick={() => setShowAddFriend(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Friend Requests List */}
                {showFriendRequests && (
                    <div className="friend-requests-list">
                        <h4 className="section-title">Friend Requests ({friendRequests.length})</h4>
                        {friendRequests.length === 0 ? (
                            <p className="empty-state">No pending friend requests</p>
                        ) : (
                            friendRequests.map(request => (
                                <div key={request.id} className="friend-request-item">
                                    <div className="request-avatar">
                                        {request.fromUserAvatar ? (
                                            <img src={request.fromUserAvatar} alt={request.fromUserName} />
                                        ) : (
                                            <div className="avatar-placeholder">
                                                {(request.fromUserName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="request-info">
                                        <p className="request-name">{request.fromUserName}</p>
                                        <p className="request-time">
                                            {new Date(request.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="request-actions">
                                        <button
                                            className="accept-btn"
                                            onClick={() => handleAcceptFriendRequest(request.id)}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            className="reject-btn"
                                            onClick={() => handleRejectFriendRequest(request.id)}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Notifications List */}
                <div className="notifications-list">
                    <h4 className="section-title">Notifications</h4>
                    {notifications.length === 0 ? (
                        <p className="empty-state">No notifications</p>
                    ) : (
                        <div className="notifications-container">
                            {notifications.slice(0, 5).map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                                    onClick={() => handleMarkNotificationAsRead(notification.id)}
                                >
                                    <p className="notification-message">{notification.message}</p>
                                    <span className="notification-time">
                                        {new Date(notification.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Friends List */}
                <div className="friends-list-section">
                    <h4 className="section-title">Friends ({friends.length})</h4>
                    <p className="friends-hint">Click on a profile to start chatting</p>
                    <div className="friends-list">
                        {friends.map(friend => (
                            <div
                                key={friend.id}
                                className={`friend-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
                                onClick={() => handleFriendClick(friend)}
                            >
                                <div className="friend-avatar">
                                    {friend.avatar ? (
                                        <img src={friend.avatar} alt={friend.name} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {(friend.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {friend.isOnline && <span className="online-indicator"></span>}
                                </div>
                                <div className="friend-info">
                                    <p className="friend-name">{friend.name}</p>
                                    <p className="friend-username">@{friend.username}</p>
                                </div>
                                {friend.isOnline && (
                                    <span className="online-badge">Online</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Settings Section */}
                <div className="settings-section">
                    <button 
                        className="settings-btn" 
                        title="Settings"
                        onClick={() => navigate('/settings')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="dashboard-main">
                {selectedFriend ? (
                    <>
                        {/* Chat Header */}
                        <div className="chat-header">
                            <button className="back-to-sidebar-btn" onClick={handleBackToSidebar}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <div className="chat-header-info">
                                <div className="chat-avatar">
                                    {selectedFriend.avatar ? (
                                        <img src={selectedFriend.avatar} alt={selectedFriend.name} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {(selectedFriend.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {selectedFriend.isOnline && <span className="online-indicator"></span>}
                                </div>
                                <div>
                                    <h3 className="chat-friend-name">{selectedFriend.name}</h3>
                                    <p className="chat-friend-status">
                                        {selectedFriend.isOnline ? 'Online' : 'Offline'}
                                    </p>
                                </div>
                            </div>
                            <div className="chat-header-actions">
                                <button className="chat-action-btn" title="Voice Call">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                </button>
                                <button className="chat-action-btn" title="Video Call">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                        <circle cx="12" cy="13" r="4"></circle>
                                    </svg>
                                </button>
                                <div className="more-options-wrapper" ref={moreOptionsRef}>
                                    <button 
                                        className="chat-action-btn" 
                                        title="More Options"
                                        onClick={() => setShowMoreOptions(!showMoreOptions)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </button>
                                    {showMoreOptions && (
                                        <div className="more-options-popup">
                                            <button 
                                                className="popup-option delete-chat"
                                                onClick={handleDeleteChat}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                                <span>Delete Chat</span>
                                            </button>
                                            <button 
                                                className="popup-option block-user"
                                                onClick={handleBlockUser}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                                </svg>
                                                <span>Block User</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages Container */}
                        <div className="messages-container" ref={messagesEndRef}>
                            {messages.map(message => {
                                const isOwnMessage = message.senderId === 'current';
                                return (
                                    <div
                                        key={message.id}
                                        className={`message ${isOwnMessage ? 'own-message' : 'friend-message'}`}
                                    >
                                        <div className="message-content">
                                            <p>{message.content}</p>
                                            <span className="message-time">
                                                {new Date(message.timestamp).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef}></div>
                        </div>

                        {/* Message Input */}
                        <form className="message-input-form" onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                className="message-input"
                            />
                            <button type="submit" className="send-button" disabled={!messageInput.trim()}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="no-chat-selected">
                        <div className="no-chat-content">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h2>Select a friend to start chatting</h2>
                            <p>Choose someone from your friends list to begin a conversation</p>
                        </div>
                    </div>
                )}
            </main>

            {/* Block User Confirmation Popup */}
            {showBlockConfirm && selectedFriend && (
                <div className="block-confirm-overlay" onClick={cancelBlockUser}>
                    <div className="block-confirm-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="block-confirm-header">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block-icon">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            <h3>Block User</h3>
                        </div>
                        <div className="block-confirm-content">
                            <p>Are you sure you want to block <strong>{selectedFriend.name}</strong>?</p>
                            <p className="block-confirm-note">You can unblock them later by going to Settings → Blocked Users and selecting unblock.</p>
                        </div>
                        <div className="block-confirm-actions">
                            <button className="cancel-block-btn" onClick={cancelBlockUser}>
                                Cancel
                            </button>
                            <button className="confirm-block-btn" onClick={confirmBlockUser}>
                                Block User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

