let selectedUserId = null;
let socket = null;
let currentUser = null;

// Initialize chat functionality
export function initializeChat() {
    const chatForm = document.getElementById('chatForm');
    const chatMessageInput = document.getElementById('chatMessageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessages = document.getElementById('chatMessages');
    const chatUsersList = document.getElementById('chatUsersList');
    const chatUserName = document.getElementById('chatUserName');

    // Load users for chat
    function loadChatUsers() {
        console.log('Loading chat users...');
        fetch('/users', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            return response.json();
        })
        .then(users => {
            console.log('Users loaded:', users);
            chatUsersList.innerHTML = '';
            users.forEach(user => {
                const userItem = document.createElement('a');
                userItem.href = '#';
                userItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
                userItem.setAttribute('data-user-id', user._id);
                userItem.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="status-dot offline"></span>
                        ${user.name}
                    </div>
                    <span class="badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'} rounded-pill">
                        ${user.role}
                    </span>
                `;
                userItem.onclick = () => selectUser(user);
                chatUsersList.appendChild(userItem);
            });
        })
        .catch(error => {
            console.error('Error loading users:', error);
            chatUsersList.innerHTML = '<div class="list-group-item text-danger">Failed to load users. Please try again.</div>';
        });
    }

    // Select user to chat with
    function selectUser(user) {
        if (!user || !user._id) {
            console.error('Invalid user selected');
            return;
        }
        
        selectedUserId = user._id;
        currentUser = user;
        chatUserName.textContent = `Chat with ${user.name}`;
        chatMessageInput.disabled = false;
        sendMessageBtn.disabled = false;
        
        // Load chat history before initializing WebSocket
        loadChatHistory(user._id);
        
        // Initialize WebSocket connection
        if (socket) {
            socket.close();
        }

        const token = localStorage.getItem('token');
        // Use wss for HTTPS connections
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/chat?token=${token}`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            console.log('WebSocket connection established');
            socket.send(JSON.stringify({ type: 'getOnlineStatus' }));
        };

        socket.onmessage = (event) => {
            console.log('WebSocket message received:', event.data);
            try {
                const data = JSON.parse(event.data);
                console.log('Parsed message data:', data);
                
                if (data.type === 'onlineStatus') {
                    console.log('Online users update received:', data.onlineUsers);
                    updateUserStatuses(data.onlineUsers);
                } else if (data.type === 'message') {
                    console.log('Received message:', data);
                    // Display message from other user
                    if (data.senderId !== currentUser._id) {
                        displayMessage({
                            sender: 'received',
                            content: data.content,
                            timestamp: data.timestamp
                        });
                    }
                } else if (data.type === 'error') {
                    console.error('Server error:', data.message);
                    displayMessage({
                        sender: 'system',
                        content: data.message,
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                displayMessage({
                    sender: 'system',
                    content: 'Error processing message',
                    timestamp: new Date()
                });
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            displayMessage({
                sender: 'system',
                content: 'WebSocket connection error. Messages may be delayed.',
                timestamp: new Date()
            });
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
            displayMessage({
                sender: 'system',
                content: 'WebSocket connection closed. Messages may be delayed.',
                timestamp: new Date()
            });
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                if (selectedUserId) {
                    selectUser(currentUser);
                }
            }, 5000);
        };
    }

    // Update user online statuses
    function updateUserStatuses(onlineUsers) {
        console.log('Updating user statuses with online users:', onlineUsers);
        const userItems = chatUsersList.querySelectorAll('.list-group-item');
        userItems.forEach(item => {
            const userId = item.getAttribute('data-user-id');
            const statusDot = item.querySelector('.status-dot');
            if (statusDot) {
                const isOnline = Array.isArray(onlineUsers) && onlineUsers.includes(userId);
                console.log(`User ${userId} is ${isOnline ? 'online' : 'offline'}`);
                statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
            }
        });
    }

    // Display a message in the chat
    function displayMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${message.content}</p>
                <small class="text-muted">${new Date(message.timestamp).toLocaleString()}</small>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Load chat history
    function loadChatHistory(userId) {
        console.log('Loading chat history for user:', userId);
        fetch(`/chat/history/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            return response.json();
        })
        .then(messages => {
            console.log('Loaded chat messages:', messages);
            chatMessages.innerHTML = '';
            messages.forEach(message => {
                const isAdmin = message.sender._id === currentUser._id;
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isAdmin ? 'sent' : 'received'}`;
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <p>${message.content}</p>
                        <small class="text-muted">${new Date(message.timestamp).toLocaleString()}</small>
                    </div>
                `;
                chatMessages.appendChild(messageDiv);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        })
        .catch(error => {
            console.error('Error loading chat history:', error);
            chatMessages.innerHTML = '<div class="text-danger">Failed to load chat history</div>';
        });
    }

    // HTTP fallback for sending messages
    function sendMessageViaHTTP(message) {
        console.log('Sending message via HTTP:', message);
        fetch('/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                recipientId: message.recipientId,
                content: message.content
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Message sent successfully via HTTP:', data);
            // Reload chat history to show the new message
            loadChatHistory(selectedUserId);
        })
        .catch(error => {
            console.error('Error sending message via HTTP:', error);
            displayMessage({
                sender: 'system',
                content: 'Failed to send message. Please try again.',
                timestamp: new Date()
            });
        });
    }

    // Send message
    chatForm.onsubmit = (e) => {
        e.preventDefault();
        const content = chatMessageInput.value.trim();
        if (!content) return;

        const message = {
            type: 'message',
            recipientId: selectedUserId,
            content: content
        };

        // Display message immediately
        displayMessage({
            sender: 'sent',
            content: content,
            timestamp: new Date()
        });

        // Send via WebSocket if connected
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }

        // Also send via HTTP as fallback
        sendMessageViaHTTP(message);
        chatMessageInput.value = '';
    };

    // Load initial users
    loadChatUsers();
    setInterval(loadChatUsers, 30000); // Refresh user list every 30 seconds
} 