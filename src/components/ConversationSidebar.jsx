import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ConversationSidebar.css';
import * as LucideIcons from 'lucide-react';
import config from '../config';

const API_ENDPOINT = config.apiUrl;

const ConversationSidebar = ({
    userId,
    currentConversationId,
    onConversationSelect,
    onNewConversation
}) => {
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const sidebarRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [conversationsWithVerifiedQueries, setConversationsWithVerifiedQueries] = useState(new Set());

    // Handle resizing
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;

            const newWidth = e.clientX;
            if (sidebarRef.current) {
                const minWidth = 200;
                const maxWidth = 400;
                const width = Math.min(Math.max(newWidth, minWidth), maxWidth);
                sidebarRef.current.style.width = `${width}px`;
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Function to fetch verified query information
    const fetchVerifiedQueryInfo = useCallback(async () => {
        try {
            console.log('Fetching verified query info...');
            const url = `${API_ENDPOINT}/conversations/verified-info`;
            console.log('Fetching verified queries from:', url);
            const response = await fetch(url);
            console.log('Verified query response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Verified query data:', data);
                setConversationsWithVerifiedQueries(new Set(data.conversation_ids));
                console.log('Updated verified conversations set:', data.conversation_ids);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch verified queries:', errorText);
            }
        } catch (error) {
            console.error('Error fetching verified query info:', error);
        }
    }, []);

    // Delete conversation handler
    const deleteConversation = async (conversationId, e) => {
        e.stopPropagation(); // Prevent triggering conversation selection
        // Check if conversation has verified queries
        if (conversationsWithVerifiedQueries.has(conversationId)) {
            const confirmed = window.confirm(
                'This conversation contains verified queries that will also be deleted. Are you sure you want to proceed?'
            );
            if (!confirmed) {
                return;
            }
        }

        try {
            const response = await fetch(`${API_ENDPOINT}/conversations/${conversationId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Refresh conversations list
                fetchConversations();
            } else {
                console.error('Failed to delete conversation');
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    };

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        if (!userId) {
            console.warn('No userId provided');
            return;
        }

        setIsLoading(true);
        try {
            console.log(`Fetching conversations for user: ${userId}`);
            const response = await fetch(`${API_ENDPOINT}/user/${userId}/conversations`);
            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Raw conversations data:', data);

                // Process and format conversations
                const processedData = (Array.isArray(data) ? data : []).map(conversation => {
                    if (!conversation) return null;
                
                    try {
                        let title = conversation.title;
                        // Add proper date handling
                        let lastAccessedAt = conversation.last_accessed_at || conversation.created_at || null;
                        let createdAt = conversation.created_at || null;
                
                        if (!title && conversation.messages && Array.isArray(conversation.messages)) {
                            const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
                            if (firstUserMsg) {
                                title = firstUserMsg.content.slice(0, 50);
                            }
                        }
                
                        if (!title && createdAt) {
                            try {
                                const date = new Date(createdAt);
                                if (!isNaN(date.getTime())) {
                                    title = `Conversation ${date.toLocaleDateString()}`;
                                } else {
                                    title = 'Untitled Conversation';
                                }
                            } catch (err) {
                                title = 'Untitled Conversation';
                            }
                        }
                
                        if (!title) {
                            title = 'Untitled Conversation';
                        }
                
                        return {
                            ...conversation,
                            title,
                            last_accessed_at: lastAccessedAt,
                            created_at: createdAt
                        };
                    } catch (err) {
                        console.error('Error processing conversation:', err);
                        return null;
                    }
                }).filter(Boolean);

                const sortedData = processedData.sort((a, b) =>
                    new Date(b.last_accessed_at || b.created_at) - new Date(a.last_accessed_at || a.created_at)
                );

                console.log('Processed conversations:', sortedData);
                setConversations(sortedData);
            } else {
                console.error('Failed to load conversations:', await response.text());
                setError('Failed to load conversations');
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setError(`Error loading conversations: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch conversations on mount and when dependencies change
    useEffect(() => {
        fetchConversations();
        fetchVerifiedQueryInfo();
    }, [userId, currentConversationId, fetchConversations, fetchVerifiedQueryInfo]);

    // Format date helper
    const formatDate = (dateString) => {
        try {
            const cleanDateString = dateString.replace(/\+\d{2}$/, '');
            const date = new Date(cleanDateString);

            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return '';
            }

            const now = new Date();

            if (date.toDateString() === now.toDateString()) {
                return date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            }

            if (date.getFullYear() === now.getFullYear()) {
                return date.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric'
                });
            }

            return date.toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            console.warn('Error formatting date:', e, 'for date string:', dateString);
            return '';
        }
    };

    // Get conversation title helper
    const getConversationTitle = (conversation) => {
        if (!conversation) return 'Untitled';

        if (conversation.title && conversation.title !== 'null' && conversation.title !== 'undefined') {
            return conversation.title;
        }

        if (conversation.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
            const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
            if (firstUserMsg && firstUserMsg.content) {
                const text = firstUserMsg.content;
                return text.length > 30 ? text.substring(0, 27) + '...' : text;
            }
        }

        if (conversation.created_at) {
            try {
                const cleanDateString = conversation.created_at.replace(/\+\d{2}$/, '');
                const date = new Date(cleanDateString);
                if (!isNaN(date.getTime())) {
                    return `Conversation ${date.toLocaleString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    })}`;
                }
            } catch (e) {
                console.warn('Error parsing date:', e);
            }
        }

        return `Conversation ${conversation.id.substring(0, 8)}`;
    };

    // Filter conversations based on search
    const filteredConversations = conversations.filter(conv =>
        !conv.is_archived && (
            (conv.title && conv.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (conv.id === searchTerm)
        )
    );

    return (
        <div className="conversation-sidebar" ref={sidebarRef}>
            <div
                className="resize-handle"
                onMouseDown={() => setIsResizing(true)}
            />
            <div className="sidebar-header">
                <h2>Conversations</h2>
                <button
                    className="new-conversation-button"
                    onClick={onNewConversation}
                >
                    <LucideIcons.Plus size={16} />
                    <span>New</span>
                </button>
            </div>

            <div className="search-container">
                <LucideIcons.Search size={16} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search conversations"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="conversations-list">
                {isLoading ? (
                    <div className="loading-state">Loading conversations...</div>
                ) : error ? (
                    <div className="error-state">{error}</div>
                ) : filteredConversations.length === 0 ? (
                    <div className="empty-state">
                        {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                    </div>
                ) : (
                    filteredConversations.slice(0, 15).map(conversation => (
                        <div
                            key={conversation.id}
                            className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`}
                            onClick={() => onConversationSelect(conversation.id)}
                        >
                            <div className="conversation-content">
                                <div className="conversation-title">
                                    {getConversationTitle(conversation)}
                                    {conversationsWithVerifiedQueries.has(conversation.id) && (
                                        <span
                                            className="verified-badge"
                                            title="Contains verified queries"
                                        >
                                            <LucideIcons.CheckCircle size={16} />
                                        </span>
                                    )}
                                </div>
                                <div className="conversation-date">
                                    {formatDate(conversation.last_accessed_at)}
                                </div>
                            </div>
                            <button
                                className={`delete-button ${conversationsWithVerifiedQueries.has(conversation.id) ? 'with-verified' : ''
                                    }`}
                                onClick={(e) => deleteConversation(conversation.id, e)}
                                title={
                                    conversationsWithVerifiedQueries.has(conversation.id)
                                        ? "Contains verified queries - Delete with caution"
                                        : "Delete conversation"
                                }
                            >
                                <LucideIcons.Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ConversationSidebar;