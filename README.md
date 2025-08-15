# Mail Service - Gmail OAuth Multi-Account App

A production-ready Node.js + Express application that allows users to connect their Gmail accounts via OAuth2 and provides admin controls for managing account access.

## 🚀 Features

- **Gmail OAuth2 Integration**: Secure authentication with Google
- **Multi-Account Support**: Users can connect and switch between multiple Gmail accounts
- **Admin Dashboard**: Web interface for managing all connected accounts
- **Premium Account Control**: Lock/unlock accounts to restrict access
- **MongoDB Integration**: Persistent storage of account data
- **Production Ready**: Configured for deployment on Render

## 🛠️ Technology Stack

- **Backend**: Node.js 18+, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Google OAuth2 (googleapis)
- **Session Management**: cookie-session
- **Security**: CORS enabled, secure session handling

## 📋 Prerequisites

Before running this application, you need:

1. **Google Cloud Console Project**:
   - Create a project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Gmail API and Google+ API
   - Create OAuth2 credentials (Web application)
   - Add authorized redirect URI: `https://your-domain.com/auth/google/callback`

2. **MongoDB Database**:
   - Local MongoDB installation OR
   - MongoDB Atlas cloud database

## ⚙️ Environment Variables

Create a `.env` file with the following variables:

```env
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://mail-service-pro.onrender.com/auth/google/callback

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/mail-service

# Session Security
SESSION_SECRET=your_super_secret_session_key_here

# Admin Configuration
ADMIN_EMAIL=your_admin_gmail@gmail.com

# Server Configuration (Optional)
PORT=3000
```

## 🚀 Installation & Setup

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Run in development mode**:
```bash
npm run dev
```

4. **Run in production mode**:
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - Handle OAuth callback
- `GET /logout` - Clear user session

### Account Access
- `GET /inbox/:email` - Get inbox emails for account (requires permission)
- `GET /` - Service information and current user

### Admin Only
- `GET /accounts` - List all connected accounts
- `POST /admin/lock/:email` - Mark account as premium (restricted)
- `POST /admin/unlock/:email` - Remove premium status (public access)
- `GET /admin` - Admin dashboard interface

## 🔒 Access Control

### Regular Users
- Can access their own Gmail accounts
- Can access non-premium (public) accounts
- Cannot access premium accounts owned by others

### Admin Users
- Can access all non-premium accounts
- Can view all accounts in admin dashboard
- Can lock/unlock accounts
- Cannot access premium accounts (unless unlocked first)

### Account Status
- **Public**: Accessible by owner and any authenticated user
- **Premium**: Accessible only by owner and admin (when unlocked)

## 🏗️ Database Schema

```javascript
{
  email: String,        // Gmail address (unique, lowercase)
  refreshToken: String, // OAuth2 refresh token
  isPremium: Boolean,   // Premium status (default: false)
  createdAt: Date,      // Account creation timestamp
  lastAccessed: Date    // Last inbox access timestamp
}
```

## 🌐 Deployment on Render

1. **Push code to GitHub repository**

2. **Create new Web Service on Render**:
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Configure Environment Variables** in Render dashboard:
   - Add all variables from `.env.example`
   - Update `GOOGLE_REDIRECT_URI` with your Render URL

4. **Update OAuth2 Settings**:
   - Add your Render URL to Google Cloud Console authorized redirect URIs

## 🔧 Development

### Project Structure
```
mail-service/
├── models/
│   └── Account.js          # MongoDB schema
├── public/
│   └── admin.html          # Admin dashboard
├── server.js               # Main Express application
├── package.json            # Dependencies and scripts
├── .env.example            # Environment template
└── README.md               # This file
```

### Scripts
- `npm start` - Production server
- `npm run dev` - Development server with nodemon
- `npm test` - Run tests (placeholder)

## 🛡️ Security Features

- **OAuth2 Secure Flow**: No password storage, Google handles authentication
- **Session Management**: Secure cookie-based sessions
- **Admin Protection**: Admin routes protected by email verification
- **CORS Enabled**: Cross-origin request support
- **Input Validation**: Email normalization and validation
- **Error Handling**: Comprehensive error handling and logging

## 📝 Usage Examples

### Connect Gmail Account
1. Visit `/auth/google`
2. Complete Google OAuth flow
3. Account automatically stored in database

### View Inbox
```bash
curl "https://your-domain.com/inbox/user@gmail.com" \
  -H "Cookie: session=your_session_cookie"
```

### Admin Operations
```bash
# Lock account (admin only)
curl -X POST "https://your-domain.com/admin/lock/user@gmail.com" \
  -H "Cookie: session=admin_session_cookie"

# Unlock account (admin only)  
curl -X POST "https://your-domain.com/admin/unlock/user@gmail.com" \
  -H "Cookie: session=admin_session_cookie"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include environment details and error logs

---

**Built with ❤️ for secure Gmail account management**