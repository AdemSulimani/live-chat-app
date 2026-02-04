# Live Chat Application - Project Description

## Overview

A full-stack real-time chat application built with modern web technologies, providing users with an instant messaging experience similar to popular chat platforms. The application features real-time messaging, friend management, voice messages, image sharing, and comprehensive privacy controls.

## Tech Stack

### Frontend
- **React 19.2.0** - Modern UI library for building user interfaces
- **TypeScript 5.9.3** - Type-safe JavaScript for better code quality
- **Vite 7.2.4** - Fast build tool and development server
- **React Router DOM 7.13.0** - Client-side routing and navigation
- **Socket.IO Client 4.8.3** - Real-time bidirectional communication
- **CSS3** - Custom styling with modern CSS features

### Backend
- **Node.js** - JavaScript runtime environment
- **Express 5.2.1** - Web application framework
- **MongoDB** - NoSQL database for data storage
- **Mongoose 9.1.5** - MongoDB object modeling tool
- **Socket.IO 4.8.3** - Real-time event-based communication
- **JSON Web Token (JWT) 9.0.3** - Secure authentication tokens
- **bcrypt 6.0.0** - Password hashing for security
- **Multer 2.0.2** - File upload handling (images and voice messages)
- **Express Rate Limit 8.2.1** - API rate limiting for security
- **Validator 13.15.26** - Input validation
- **CORS 2.8.6** - Cross-origin resource sharing
- **dotenv 17.2.3** - Environment variable management

## Key Features

### 🔐 Authentication & User Management
- User registration and login with secure password hashing
- JWT-based authentication system
- Protected and public routes
- User profile creation and management
- Profile photo upload and management
- Customizable user profiles with bio, status messages, and usernames

### 💬 Real-Time Messaging
- **Instant messaging** - Real-time message delivery using Socket.IO
- **Message types**:
  - Text messages
  - Image sharing with preview
  - Voice messages with recording and playback
- **Message management**:
  - Edit sent messages
  - Delete/unsend messages
  - Message status indicators (sent, delivered, seen)
  - Message timestamps
  - Edited message indicators
- **Message pagination** - Load more messages for chat history
- **Typing indicators** - Real-time typing status display

### 👥 Friend Management
- **Add friends** - Search and send friend requests by username or email
- **Friend requests**:
  - Send friend requests
  - Accept or reject incoming requests
  - View pending requests with notifications
- **Friends list** - View all friends with online/offline status
- **Friend management** - View and manage friend relationships

### 🔔 Notifications System
- Real-time notifications for:
  - New friend requests
  - New messages
  - Friend activity updates
- Unread notification badges
- Mark notifications as read
- Mark all notifications as read

### 🎭 Activity Status & Privacy
- **Activity status** - Online, offline, and "Do Not Disturb" modes
- **Last seen** - Configurable last seen visibility:
  - Show last seen to everyone
  - Show last seen to friends only
  - Hide last seen completely
  - Reciprocity-based last seen (only shows if both users have it enabled)
- **Real-time status updates** - Status changes reflect immediately across all connected clients

### 🚫 User Blocking
- Block users to prevent communication
- View blocked users list
- Unblock users
- Blocked users cannot send messages
- Automatic message blocking notifications

### 📱 User Interface
- **Responsive design** - Works on desktop and mobile devices
- **Sidebar navigation** - Collapsible sidebar for friends list and actions
- **Chat interface**:
  - Clean message bubbles (sent/received)
  - Image preview before sending
  - Voice recording interface with waveform visualization
  - Audio player for voice messages
  - Message options menu (edit/delete)
- **Profile views**:
  - Mini profile in sidebar
  - Full profile page
- **Settings page** - Centralized settings management

### 🎨 User Experience Features
- **Loading states** - Visual feedback during data fetching
- **Error handling** - User-friendly error messages
- **Success notifications** - Confirmation messages for actions
- **Empty states** - Helpful messages when no data is available
- **Smooth animations** - Transitions and hover effects
- **Click-outside detection** - Close popups and menus by clicking outside

### 🔒 Security Features
- Password encryption with bcrypt
- JWT token-based authentication
- API rate limiting
- Input validation
- CORS configuration
- Protected routes
- File upload validation

### 📂 File Management
- Profile photo uploads
- Chat image sharing
- Voice message recording and storage
- File organization in dedicated upload directories

## Project Structure

```
live-chat-app/
├── Backend/              # Node.js/Express backend
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, error handling, rate limiting
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API route definitions
│   ├── socket/          # Socket.IO server implementation
│   └── uploads/         # File storage (images, voice messages)
│
└── live-chat/           # React frontend
    ├── src/
    │   ├── Components/  # React components
    │   │   ├── Code/    # Component logic
    │   │   └── Style/   # CSS stylesheets
    │   ├── contexts/    # React contexts (User, Socket)
    │   ├── hooks/       # Custom React hooks
    │   └── utils/       # Utility functions
    └── public/          # Static assets
```

## API Endpoints

The backend provides RESTful API endpoints for:
- Authentication (login, register)
- User profiles
- Friend management
- Friend requests
- Messages
- Notifications
- Blocked users
- Activity status
- User search

## Real-Time Events

Socket.IO events for:
- Message sending and receiving
- Typing indicators
- Online/offline status updates
- Friend request notifications
- Message status updates (delivered/seen)
- Activity status changes

## Development

### Frontend
- Development server: `npm run dev` (Vite)
- Build: `npm run build`
- Preview: `npm run preview`

### Backend
- Development: `npm run dev` (with nodemon)
- Production: `npm start`

## Environment Variables

The application uses environment variables for:
- Database connection strings
- JWT secret keys
- Server ports
- Frontend URLs
- File upload configurations

---

**Note**: This is a comprehensive real-time chat application demonstrating modern full-stack development practices with real-time communication, file handling, and user management features.
