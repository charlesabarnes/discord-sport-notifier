import mongoose from 'mongoose';

export interface LeagueDocument extends mongoose.Document {
  leagueId: string;
  leagueName: string;
  leagueLogo?: string;
  guildId: string;
  notifyRoleId: string;
  channelId: string;
  excludedWords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeagueSchema = new mongoose.Schema({
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
LeagueSchema.index({ leagueId: 1, guildId: 1 }, { unique: true });

export default mongoose.model<LeagueDocument>('League', LeagueSchema);