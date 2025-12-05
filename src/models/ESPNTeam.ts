import mongoose from 'mongoose';

export interface ESPNTeamDocument extends mongoose.Document {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  sport: string;      // e.g., "football", "basketball", "racing"
  leagueSlug: string; // e.g., "nfl", "nba", "f1"
  guildId: string;
  notifyRoleId: string;
  channelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ESPNTeamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
  },
  teamName: {
    type: String,
    required: true
  },
  teamLogo: {
    type: String
  },
  sport: {
    type: String,
    required: true
  },
  leagueSlug: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  notifyRoleId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
}, {
  timestamps: true
});

// Create a compound index to prevent duplicates
ESPNTeamSchema.index({ teamId: 1, sport: 1, leagueSlug: 1, guildId: 1 }, { unique: true });

// Use 'espnteams' collection name
export default mongoose.model<ESPNTeamDocument>('ESPNTeam', ESPNTeamSchema, 'espnteams');
