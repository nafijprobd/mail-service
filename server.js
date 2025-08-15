const express = require('express');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('cookie-session');
const cors = require('cors');

dotenv.config();
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET }));

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new mongoose.Schema({
  email: String,
  refreshToken: String,
  isPremium: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

app.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
  res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  await User.findOneAndUpdate(
    { email: data.email },
    { refreshToken: tokens.refresh_token },
    { upsert: true }
  );

  res.send('Gmail connected successfully.');
});

app.get('/inbox/:email', async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  if (!user) return res.status(404).send('User not found');

  oauth2Client.setCredentials({ refresh_token: user.refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const messages = await gmail.users.messages.list({ userId: 'me', maxResults: 5 });
  res.json(messages.data);
});

app.listen(5000, () => console.log('Server running on port 5000'));
