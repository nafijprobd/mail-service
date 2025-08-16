const express = require('express');
const mongoose = require('mongoose');
const cookieSession = require('cookie-session');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const Account = require('./models/Account');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with fixed secret
app.use(cookieSession({
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  keys: ['nafijpro25']
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection with improved configuration
const mongoUri = process.env.MONGO_URI || 'mongodb+srv://nafijrahaman2026:nafijpro++@mail-service.tirbgc7.mongodb.net/mail-service?retryWrites=true&w=majority&appName=mail-service';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas');
  console.log('📊 Database ready for operations');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('💡 Please check:');
  console.error('   1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for all IPs)');
  console.error('   2. Database credentials are correct');
  console.error('   3. Network connectivity');
  
  // Don't exit the process, let it continue with limited functionality
  console.log('⚠️  Server will continue without database functionality');
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
    process.exit(1);
  }
});

// Google OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://mail-service-pro.onrender.com/auth/google/callback'
);

// OAuth scopes for Gmail and user profile access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

/**
 * Middleware: Check if user is admin (password-protected)
 */
const checkAdmin = (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * Middleware: Check if user can access a specific Gmail account
 * Access is allowed if:
 * 1. User owns the account, OR
 * 2. Account is not premium (public access), OR  
 * 3. User is admin
 */
const checkAccess = async (req, res, next) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please try again later.' 
      });
    }
    
    const { email } = req.params;
    const userEmail = req.session.userEmail;
    const isAdmin = req.session.isAdmin;
    
    // Find the requested account in database
    const account = await Account.findOne({ email: email.toLowerCase() });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Check access permissions
    const isOwner = userEmail === email.toLowerCase();
    const isPublicAccess = !account.isPremium;
    
    if (isOwner || isAdmin || isPublicAccess) {
      req.account = account;
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied. This is a premium account.' 
    });
    
  } catch (error) {
    console.error('Access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Routes

/**
 * GET / - Landing page
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /auth/google - Initiate Google OAuth2 flow
 */
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  console.log('🔄 Redirecting to Google OAuth:', authUrl);
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback - Handle OAuth2 callback from Google
 */
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code not provided');
  }
  
  try {
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user profile information
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();
    
    const userEmail = profile.email.toLowerCase();
    
    // Store or update user account in database (with error handling)
    if (mongoose.connection.readyState === 1) {
      try {
        await Account.findOneAndUpdate(
          { email: userEmail },
          { 
            email: userEmail,
            refreshToken: tokens.refresh_token,
            lastAccessed: new Date()
          },
          { 
            upsert: true,
            new: true,
            timeout: 10000 // 10 second timeout
          }
        );
        console.log('✅ User account saved to database:', userEmail);
      } catch (dbError) {
        console.error('❌ Database save error:', dbError.message);
        // Continue without saving to database
        console.log('⚠️  Continuing without database save');
      }
    } else {
      console.log('⚠️  Database not connected, skipping account save');
    }
    
    // Store user email in session
    req.session.userEmail = userEmail;
    
    console.log('✅ User authenticated:', userEmail);
    
    // Redirect to inbox with the connected account
    res.redirect('/inbox.html');
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * GET /inbox/:email - Retrieve inbox emails for specified Gmail account
 */
app.get('/inbox/:email', checkAccess, async (req, res) => {
  try {
    const { account } = req;
    
    // Set up OAuth2 client with stored refresh token
    const accountOAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://mail-service-pro.onrender.com/auth/google/callback'
    );
    
    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });
    
    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });
    
    // Get list of messages from inbox (last 10)
    const { data: messageList } = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 10
    });
    
    if (!messageList.messages) {
      return res.json({ emails: [], account: account.email });
    }
    
    // Get detailed information for each message
    const emailPromises = messageList.messages.map(async (message) => {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date']
      });
      
      const headers = data.payload.headers;
      const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
      
      return {
        id: message.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        date: getHeader('Date'),
        snippet: data.snippet
      };
    });
    
    const emails = await Promise.all(emailPromises);
    
    // Update last accessed timestamp
    await Account.findByIdAndUpdate(account._id, { lastAccessed: new Date() });
    
    console.log(`📧 Retrieved ${emails.length} emails for ${account.email}`);
    res.json({ 
      emails, 
      account: account.email,
      isPremium: account.isPremium
    });
    
  } catch (error) {
    console.error('❌ Inbox fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * GET /email/:email/:messageId - Get full email content
 */
app.get('/email/:email/:messageId', checkAccess, async (req, res) => {
  try {
    const { account } = req;
    const { messageId } = req.params;
    
    // Set up OAuth2 client with stored refresh token
    const accountOAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://mail-service-pro.onrender.com/auth/google/callback'
    );
    
    accountOAuth.setCredentials({
      refresh_token: account.refreshToken
    });
    
    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: accountOAuth });
    
    // Get full message content
    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });
    
    const headers = data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
    
    // Extract email body
    let body = '';
    if (data.payload.body.data) {
      body = Buffer.from(data.payload.body.data, 'base64').toString();
    } else if (data.payload.parts) {
      const textPart = data.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }
    
    res.json({
      id: messageId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
      body: body,
      snippet: data.snippet
    });
    
  } catch (error) {
    console.error('❌ Email fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

/**
 * GET /accounts - List all stored Gmail accounts (Admin only)
 */
app.get('/accounts', checkAdmin, async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database temporarily unavailable. Please try again later.',
        accounts: []
      });
    }
    
    const accounts = await Account.find({}).select({
      email: 1,
      isPremium: 1,
      createdAt: 1,
      lastAccessed: 1
    }).sort({ createdAt: -1 });
    
    console.log(`👨‍💼 Admin requested accounts list`);
    res.json({ accounts });
    
  } catch (error) {
    console.error('❌ Accounts fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch accounts: ' + error.message,
      accounts: []
    });
  }
});

/**
 * GET /available-accounts - Get accounts available to current user
 */
app.get('/available-accounts', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json({ 
        accounts: [],
        message: 'Database temporarily unavailable'
      });
    }
    
    const userEmail = req.session.userEmail;
    const isAdmin = req.session.isAdmin;
    
    let query = {};
    
    if (!isAdmin && userEmail) {
      // Regular users can see their own accounts and non-premium accounts
      query = {
        $or: [
          { email: userEmail },
          { isPremium: false }
        ]
      };
    } else if (isAdmin) {
      // Admin can see all accounts
      query = {};
    } else {
      // Non-authenticated users can only see non-premium accounts
      query = { isPremium: false };
    }
    
    const accounts = await Account.find(query).select({
      email: 1,
      isPremium: 1
    }).sort({ email: 1 });
    
    res.json({ accounts });
    
  } catch (error) {
    console.error('❌ Available accounts fetch error:', error);
    res.json({ 
      accounts: [],
      error: 'Failed to fetch available accounts: ' + error.message
    });
  }
});

/**
 * POST /admin/lock/:email - Lock account (make premium) - Admin only
 */
app.post('/admin/lock/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    
    const account = await Account.findOne({ email: email.toLowerCase() });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Lock account (make premium)
    account.isPremium = true;
    await account.save();
    
    console.log(`🔒 Admin locked account: ${email}`);
    
    res.json({ 
      success: true, 
      message: `Account ${email} locked`,
      account: {
        email: account.email,
        isPremium: account.isPremium
      }
    });
    
  } catch (error) {
    console.error('❌ Account lock error:', error);
    res.status(500).json({ error: 'Failed to lock account' });
  }
});

/**
 * POST /admin/unlock/:email - Unlock account (make public) - Admin only
 */
app.post('/admin/unlock/:email', checkAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    
    const account = await Account.findOne({ email: email.toLowerCase() });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Unlock account (make public)
    account.isPremium = false;
    await account.save();
    
    console.log(`🔓 Admin unlocked account: ${email}`);
    
    res.json({ 
      success: true, 
      message: `Account ${email} unlocked`,
      account: {
        email: account.email,
        isPremium: account.isPremium
      }
    });
    
  } catch (error) {
    console.error('❌ Account unlock error:', error);
    res.status(500).json({ error: 'Failed to unlock account' });
  }
});

/**
 * GET /admin - Serve admin dashboard
 */
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/**
 * POST /admin/login - Admin login with password
 */
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === 'nafijpro++') {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Admin login successful' });
  } else {
    res.status(401).json({ error: 'Invalid admin password' });
  }
});

/**
 * GET /logout - Clear user session
 */
app.get('/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mail Service running on port ${PORT}`);
  console.log(`📧 Gmail OAuth2 service ready`);
  console.log(`👨‍💼 Admin password: nafijpro++`);
});

module.exports = app;
