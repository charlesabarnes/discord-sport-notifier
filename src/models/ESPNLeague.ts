import mongoose from 'mongoose';

export interface ESPNLeagueDocument extends mongoose.Document {
  leagueId: string;  // ESPN league slug (e.g., "nfl", "nba", "eng.1")
  leagueName: string;
  leagueLogo?: string;
  sport: string;     // e.g., "football", "basketball", "soccer"
  guildId: string;
  notifyRoleId: string;
  channelId: string;
  excludedWords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ESPNLeagueSchema = new mongoose.Schema({
  leagueId: {
    type: String,
    required: true,
  },
  leagueName: {
    type: String,
    required: true
  },
  leagueLogo: {
    type: String
  },
  sport: {
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
  excludedWords: {
    type: [String],
    default: []
  },
}, {
  timestamps: true
});

// Create a compound index to prevent duplicates
ESPNLeagueSchema.index({ leagueId: 1, sport: 1, guildId: 1 }, { unique: true });

// Use 'espnleagues' collection name
export default mongoose.model<ESPNLeagueDocument>('ESPNLeague', ESPNLeagueSchema, 'espnleagues');
