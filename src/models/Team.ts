import mongoose from 'mongoose';

export interface TeamDocument extends mongoose.Document {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  guildId: string;
  notifyRoleId: string;
  channelId: string;
  environment: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new mongoose.Schema({
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
  environment: {
    type: String,
    default: 'production'
  }
}, {
  timestamps: true
});

// Create a compound index to prevent duplicates
TeamSchema.index({ teamId: 1, guildId: 1, environment: 1 }, { unique: true });

export default mongoose.model<TeamDocument>('Team', TeamSchema);