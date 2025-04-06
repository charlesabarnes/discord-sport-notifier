import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import Team from './Team';
import League from './League';

dotenv.config();

// Get MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-sport-notifier';

// Interface for config structure
export interface ConfigTeam {
  teamId: string;
  notifyRoleId: string;
  channelId: string;
}

export interface ConfigLeague {
  leagueId: string;
  notifyRoleId: string;
  channelId: string;
  excludedWords?: string[];
}

export interface Config {
  teams: ConfigTeam[];
  leagues: ConfigLeague[];
}

// Connect to MongoDB
export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Get config from MongoDB (environment parameter is ignored now)
export async function getConfigFromMongoDB(env: string = 'production'): Promise<Config> {
  try {
    // Get teams and leagues from MongoDB - no longer filtering by environment
    const teams = await Team.find({}).lean();
    const leagues = await League.find({}).lean();
    
    // Convert to config format
    const config: Config = {
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
    
    return config;
  } catch (error) {
    console.error('Error getting config from MongoDB:', error);
    // Return empty config on error
    return { teams: [], leagues: [] };
  }
}