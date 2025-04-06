import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { Client, GatewayIntentBits } from 'discord.js';
import mongoose from 'mongoose';

// Import models
import Team from './models/Team';
import League from './models/League';

dotenv.config();

const app = express();
const PORT = process.env.UI_PORT || 3000;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
// Get base URL or use localhost as fallback
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || `${BASE_URL}/auth/discord/callback`;

// Check if Discord OAuth credentials are set
const DISCORD_OAUTH_ENABLED = !!(CLIENT_ID && CLIENT_SECRET);
const SESSION_SECRET = process.env.SESSION_SECRET || 'discord-sport-notifier-secret';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-sport-notifier';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Discord client for API calls
const discordClient = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages
  ] 
});

// Configure handlebars
app.engine('handlebars', engine({ 
  defaultLayout: 'main',
  helpers: {
    eq: function(v1: any, v2: any) {
      return v1 === v2;
    },
    neq: function(v1: any, v2: any) {
      return v1 !== v2;
    },
    and: function(v1: any, v2: any) {
      return v1 && v2;
    },
    or: function(v1: any, v2: any) {
      return v1 || v2;
    },
    firstChar: function(text: string) {
      return text && text.length > 0 ? text.charAt(0) : '';
    }
  }
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

// Configure session
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native'
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Configure passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

// Configure Discord strategy if OAuth credentials are available
if (DISCORD_OAUTH_ENABLED) {
  console.log('Discord OAuth is enabled');
  passport.use(new DiscordStrategy({
    clientID: CLIENT_ID!,
    clientSecret: CLIENT_SECRET!,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
  }, (accessToken: string, refreshToken: string, profile: any, done: any) => {
    // Store the access token for API calls
    profile.accessToken = accessToken;
    return done(null, profile);
  }));
} else {
  console.warn('Discord OAuth is disabled - CLIENT_ID and CLIENT_SECRET not configured');
}

// Configure middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Authentication middleware
// Using type augmentation for passport
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      avatar: string;
      accessToken: string;
      guilds?: any[];
    }
  }
}

function isAuthenticated(req: any, res: any, next: any) {
  // If Discord OAuth is disabled, skip authentication
  if (!DISCORD_OAUTH_ENABLED) {
    return next();
  }
  
  // Otherwise check authentication
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.redirect('/login');
}

// Connect Discord client using the bot token if available
let discordBotStatus = "Not connected";

if (process.env.DISCORD_TOKEN) {
  discordClient.login(process.env.DISCORD_TOKEN)
    .then(() => {
      console.log('Discord client connected');
      discordBotStatus = "Connected";
    })
    .catch(err => {
      console.error('Failed to connect Discord client:', err);
      discordBotStatus = "Connection failed";
    });
} else {
  console.warn('DISCORD_TOKEN not provided - Discord client connection disabled');
  discordBotStatus = "No token provided";
}

// Discord API wrapper functions
async function getGuilds(accessToken: string) {
  try {
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch guilds: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }
}

// Get channels and roles for a specific guild
async function getGuildData(guildId: string) {
  // If Discord client is not available or token missing
  if (!process.env.DISCORD_TOKEN || !discordClient.isReady()) {
    console.warn('Discord client not ready when fetching guild data');
    return { 
      channels: [], 
      roles: [],
      error: "Discord bot not connected. Please make sure the DISCORD_TOKEN is configured." 
    };
  }
  
  try {
    // Check if the bot is a member of the guild
    const guild = await discordClient.guilds.fetch(guildId).catch(error => {
      if (error.code === 10004) { // Unknown Guild error
        throw new Error("Bot is not a member of this server. Please add the bot to your Discord server.");
      }
      throw error;
    });
    
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    
    return {
      channels: channels.filter(c => c?.type === 0).map(c => ({ 
        id: c!.id, 
        name: c!.name 
      })),
      roles: roles.map(r => ({ 
        id: r.id, 
        name: r.name, 
        color: r.hexColor 
      }))
    };
  } catch (error: any) {
    console.error('Error fetching guild data:', error);
    return { 
      channels: [], 
      roles: [],
      error: error.message || "Failed to fetch guild data" 
    };
  }
}

// Interface for config structure
interface ConfigTeam {
  teamId: string;
  notifyRoleId: string;
  channelId: string;
}

interface ConfigLeague {
  leagueId: string;
  notifyRoleId: string;
  channelId: string;
  excludedWords?: string[];
}

interface Config {
  teams: ConfigTeam[];
  leagues: ConfigLeague[];
}

// Configuration helper functions - now using MongoDB
async function getConfig(): Promise<Config> {
  try {
    const teams = await Team.find({});
    const leagues = await League.find({});
    
    return {
      teams: teams.map(team => ({
        teamId: team.teamId,
        notifyRoleId: team.notifyRoleId,
        channelId: team.channelId
      })),
      leagues: leagues.map(league => ({
        leagueId: league.leagueId,
        notifyRoleId: league.notifyRoleId,
        channelId: league.channelId,
        excludedWords: league.excludedWords
      }))
    };
  } catch (error) {
    console.error('Error reading config from MongoDB:', error);
    // Return empty config if error
    return { teams: [], leagues: [] };
  }
}

// This function is now deprecated as we use direct MongoDB operations
// Keeping interface compatibility for legacy code
async function saveConfig(config: Config): Promise<void> {
  console.warn('saveConfig is deprecated, use direct MongoDB operations instead');
}

// Auth routes
app.get('/login', (req, res) => {
  if (!DISCORD_OAUTH_ENABLED) {
    // If OAuth is disabled, redirect to direct config page
    return res.redirect('/config-direct');
  }
  
  res.render('login', {
    title: 'Login with Discord',
    layout: 'auth'
  });
});

// Direct config access when OAuth is disabled
app.get('/config-direct', async (req, res) => {
  const config = await getConfig();
  
  res.render('config-direct', {
    config: config
  });
});

// Only add OAuth routes if enabled
if (DISCORD_OAUTH_ENABLED) {
  app.get('/auth/discord', passport.authenticate('discord'));
  
  app.get('/auth/discord/callback', 
    passport.authenticate('discord', { 
      failureRedirect: '/login' 
    }), 
    (req, res) => {
      res.redirect('/');
    }
  );
  
  app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) { return res.redirect('/'); }
      res.redirect('/login');
    });
  });
}

// Protected routes
app.get('/', isAuthenticated, async (req, res) => {
  const config = await getConfig();
  
  // If OAuth is disabled, redirect to direct config
  if (!DISCORD_OAUTH_ENABLED) {
    return res.redirect('/config-direct');
  }
  
  // Get user's guilds
  const user = req.user as any;
  const guilds = await getGuilds(user.accessToken);
  
  res.render('home', { 
    user: user,
    guilds: guilds,
    config: config,
    discordBotStatus: discordBotStatus
  });
  return;
});

// API routes for config management
app.get('/api/config', async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
});

// Legacy config endpoint - now redirects to use the Teams and Leagues APIs directly
app.post('/api/config', (req, res) => {
  return res.status(410).json({ 
    error: 'This endpoint is deprecated. Use /api/teams and /api/leagues endpoints instead.',
    message: 'The application now uses MongoDB directly and no longer uses config.json'
  });
});

// Team-specific endpoints
app.post('/api/teams', async (req, res) => {
  try {
    const { teamId, teamName, teamLogo, notifyRoleId, channelId, guildId } = req.body;
    
    // Create new team in MongoDB
    const newTeam = new Team({
      teamId,
      teamName,
      teamLogo,
      guildId,
      notifyRoleId,
      channelId
    });
    
    await newTeam.save();
    
    // Return success response
    if (req.headers.accept?.includes('application/json')) {
      res.json({ success: true, team: newTeam });
    } else {
      res.redirect('/');
    }
  } catch (error: any) {
    console.error('Failed to add team:', error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This team already exists for this server' });
    }
    
    res.status(500).json({ error: 'Failed to add team' });
  }
});

app.get('/api/teams', async (req, res) => {
  try {
    const guildId = req.query.guildId as string;
    
    // Query parameters for filtering
    const query: any = {};
    if (guildId) {
      query.guildId = guildId;
    }
    
    const teams = await Team.find(query).sort({ updatedAt: -1 });
    res.json(teams);
  } catch (error) {
    console.error('Failed to get teams:', error);
    res.status(500).json({ error: 'Failed to get teams' });
  }
});

app.delete('/api/teams/:teamId', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const guildId = req.query.guildId as string;
    
    // Delete team from MongoDB
    const result = await Team.deleteOne({
      teamId,
      guildId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// League-specific endpoints
app.post('/api/leagues', async (req, res) => {
  try {
    const { leagueId, leagueName, leagueLogo, notifyRoleId, channelId, excludedWords, guildId } = req.body;
    
    // Process excluded words
    let excludedWordsArray: string[] = [];
    if (Array.isArray(excludedWords)) {
      excludedWordsArray = excludedWords;
    } else if (typeof excludedWords === 'string') {
      excludedWordsArray = excludedWords.split(',').map((word: string) => word.trim()).filter(Boolean);
    }
    
    // Create new league in MongoDB
    const newLeague = new League({
      leagueId,
      leagueName,
      leagueLogo,
      guildId,
      notifyRoleId,
      channelId,
      excludedWords: excludedWordsArray
    });
    
    await newLeague.save();
    
    // Return success response
    if (req.headers.accept?.includes('application/json')) {
      res.json({ success: true, league: newLeague });
    } else {
      res.redirect('/');
    }
  } catch (error: any) {
    console.error('Failed to add league:', error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This league already exists for this server' });
    }
    
    res.status(500).json({ error: 'Failed to add league' });
  }
});

app.get('/api/leagues', async (req, res) => {
  try {
    const guildId = req.query.guildId as string;
    
    // Query parameters for filtering
    const query: any = {};
    if (guildId) {
      query.guildId = guildId;
    }
    
    const leagues = await League.find(query).sort({ updatedAt: -1 });
    res.json(leagues);
  } catch (error) {
    console.error('Failed to get leagues:', error);
    res.status(500).json({ error: 'Failed to get leagues' });
  }
});

app.delete('/api/leagues/:leagueId', async (req, res) => {
  try {
    const leagueId = req.params.leagueId;
    const guildId = req.query.guildId as string;
    
    // Delete league from MongoDB
    const result = await League.deleteOne({
      leagueId,
      guildId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete league:', error);
    res.status(500).json({ error: 'Failed to delete league' });
  }
});

// Discord data API endpoints
app.get('/api/discord/guilds', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const guilds = await getGuilds(user.accessToken);
    res.json(guilds);
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guilds' });
    return;
  }
});

app.get('/api/discord/guilds/:guildId', isAuthenticated, async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const guildData = await getGuildData(guildId);
    res.json(guildData);
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guild data' });
    return;
  }
});

// Sports DB API Search Endpoints
app.get('/api/sportsdb/search/teams', isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }
    
    const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/searchteams.php?t=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data.teams || []);
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to search teams' });
    return;
  }
});

app.get('/api/sportsdb/search/leagues', isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }
    
    const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/search_all_leagues.php?l=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data.leagues || []);
    return;
  } catch (error) {
    res.status(500).json({ error: 'Failed to search leagues' });
    return;
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});