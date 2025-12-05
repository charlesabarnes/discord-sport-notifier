import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import ESPNTeam from './ESPNTeam';
import ESPNLeague from './ESPNLeague';

dotenv.config();

// Get MongoDB URI from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-sport-notifier';

// Interface for config structure
export interface ConfigTeam {
  teamId: string;
  sport: string;
  leagueSlug: string;
  notifyRoleId: string;
  channelId: string;
}

export interface ConfigLeague {
  leagueId: string;
  sport: string;
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

// Get ESPN config from MongoDB (uses new espnteams/espnleagues collections)
export async function getConfigFromMongoDB(env: string = 'production'): Promise<Config> {
  try {
    // Get teams and leagues from ESPN collections
    const teams = await ESPNTeam.find({}).lean();
    const leagues = await ESPNLeague.find({}).lean();

    // Convert to config format
    const config: Config = {
      teams: teams.map(team => ({
        teamId: team.teamId,
        sport: team.sport,
        leagueSlug: team.leagueSlug,
        notifyRoleId: team.notifyRoleId,
        channelId: team.channelId
      })),
      leagues: leagues.map(league => ({
        leagueId: league.leagueId,
        sport: league.sport,
        notifyRoleId: league.notifyRoleId,
        channelId: league.channelId,
        excludedWords: league.excludedWords
      }))
    };

    return config;
  } catch (error) {
    console.error('Error getting ESPN config from MongoDB:', error);
    // Return empty config on error
    return { teams: [], leagues: [] };
  }
}