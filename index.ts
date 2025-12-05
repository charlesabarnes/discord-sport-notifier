import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
import { connectToDatabase, getConfigFromMongoDB, Config, ConfigTeam, ConfigLeague } from './src/models/db';
import { getUpcomingEvents, getUpcomingTeamEvents, ESPNEvent } from './src/libs/espn';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI; // Your MongoDB connection string
const DB_NAME = process.env.DB_NAME || 'sportsdb';
const COLLECTION_NAME = process.env.ESPN_COLLECTION_NAME || 'espngames'; // New collection for ESPN data

type Game = {
  eventId: string;
  eventName: string;
  eventDate: Date;
  notified: boolean;
  teamId?: string;
  notifyRoleId: string;
  channelId: string;
};

// Initialize config
let config: Config = { teams: [], leagues: [] };


let db: Db;
let gamesCollection: Collection<Game>;

const mongoClient = new MongoClient(MONGODB_URI!);

async function connectToMongoDBForGames() {
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  gamesCollection = db.collection(COLLECTION_NAME);
  console.log('Connected to MongoDB for games collection');
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  // Connect to MongoDB for our games collection
  await connectToMongoDBForGames();
  
  // Connect to Mongoose for config
  await connectToDatabase();
  
  // Get the configuration from MongoDB
  config = await getConfigFromMongoDB();
  console.log(`Loaded config from MongoDB: ${config.teams.length} teams, ${config.leagues.length} leagues`);
  
  // Start the scheduling
  console.log('Initializing event scheduling...');
  scheduleDailyCheck();
  checkUpcomingGames().catch(err => console.error('Initial checkUpcomingGames failed:', err));
  console.log('Starting notification check interval (every 60 seconds)');
  setInterval(checkDatabaseForNotifications, 60*1000); // Check every 1 minute
});

function scheduleDailyCheck() {
  const now = new Date();
  const nextCheck = new Date();
  nextCheck.setDate(nextCheck.getDate() + 1);
  nextCheck.setHours(0, 0, 0, 0); // Next midnight

  const timeUntilNextCheck = nextCheck.getTime() - now.getTime();
  console.log(`Scheduling next daily check for ${nextCheck.toISOString()}, in ${Math.round(timeUntilNextCheck / 1000 / 60)} minutes`);
  
  setTimeout(() => {
    console.log('Running scheduled daily check at', new Date().toISOString());
    checkUpcomingGames();
    setInterval(() => {
      console.log('Running scheduled daily check at', new Date().toISOString());
      checkUpcomingGames();
    }, 86400000); // Every 24 hours after that
  }, timeUntilNextCheck);
}

async function checkUpcomingGames() {
  try {
    console.log(`Starting checkUpcomingGames at ${new Date().toISOString()}`);
    
    // Refresh config from database
    config = await getConfigFromMongoDB();
    console.log(`Refreshed config: ${config?.teams?.length || 0} teams and ${config?.leagues?.length || 0} leagues`);

    const teamPromises = (config?.teams || []).map(async (team) => {
      await fetchUpcomingGames(team.teamId, team.sport, team.leagueSlug, team.notifyRoleId, team.channelId);
    });

    const leaguePromises = (config?.leagues || []).map(async (league) => {
      await fetchUpcomingLeagueEvents(league.leagueId, league.sport, league.notifyRoleId, league.channelId, league.excludedWords);
    });

    await Promise.all([...teamPromises, ...leaguePromises]);
    console.log('Completed checkUpcomingGames successfully');
  } catch (error) {
    console.error('Error in checkUpcomingGames:', error);
  }
}

async function fetchUpcomingLeagueEvents(leagueId: string, sport: string, notifyRoleId: string, leagueChannelId: string, excludedWords?: string[]) {
  try {
    console.log(`Fetching events for league ${leagueId} (${sport})`);

    const events = await getUpcomingEvents(sport, leagueId);

    if (events && events.length > 0) {
      for (const event of events) {
        if (excludedWords && excludedWords.length > 0) {
          const excluded = excludedWords.some(word =>
            event.name.toLowerCase().includes(word.toLowerCase())
          );
          if (excluded) {
            console.log(`Excluded event: ${event.name}`);
            continue;
          }
        }

        // ESPN uses ISO 8601 date format
        const gameDate = new Date(event.date);

        console.log(`Event: ${event.name}, Date: ${event.date}, Parsed date: ${gameDate}`);
        const game = {
          eventId: event.id,
          eventName: event.name,
          eventDate: gameDate,
          notifyRoleId,
          channelId: leagueChannelId,
        };
        await gamesCollection.updateOne(
          { eventId: event.id },
          { $set: game },
          { upsert: true }
        );
      }
      console.log(`Fetched and stored ${events.length} events for league ${leagueId}`);
    } else {
      console.log(`No upcoming events found for league ${leagueId}`);
    }
  } catch (error) {
    console.error(`Error fetching upcoming league events for league ${leagueId}:`, error);
  }
}

async function fetchUpcomingGames(teamId: string, sport: string, leagueSlug: string, notifyRoleId: string, leagueChannelId: string) {
  try {
    console.log(`Fetching games for team ${teamId} (${sport}/${leagueSlug})`);

    const events = await getUpcomingTeamEvents(sport, leagueSlug, teamId);

    if (events && events.length > 0) {
      for (const event of events) {
        // ESPN uses ISO 8601 date format
        const gameDate = new Date(event.date);

        console.log(`Event: ${event.name}, Date: ${event.date}, Parsed date: ${gameDate}`);
        const game = {
          eventId: event.id,
          eventName: event.name,
          eventDate: gameDate,
          teamId,
          notifyRoleId,
          channelId: leagueChannelId,
        };
        await gamesCollection.updateOne(
          { eventId: event.id },
          { $set: game },
          { upsert: true }
        );
      }
      console.log(`Fetched and stored ${events.length} games for team ${teamId}`);
    } else {
      console.log(`No upcoming games found for team ${teamId}`);
    }
  } catch (error) {
    console.error(`Error fetching upcoming games for team ${teamId}:`, error);
  }
}

async function checkDatabaseForNotifications() {
  const tenMinutesAgo = new Date((new Date()).getTime() - 600000);
  const tenMinutesFromNow = new Date((new Date()).getTime() + 600000);

  try {
    const games = await gamesCollection.find({
      eventDate: { $gte: tenMinutesAgo, $lte: tenMinutesFromNow },
      $or: [
        { notified: { $exists: false } },
        { notified: false }
      ]
    }).toArray();
    for (const game of games) {
      const channel = client.channels.cache.get(game.channelId!) as TextChannel;
      if (channel) {
        const eventDateUnix = Math.floor(game.eventDate.getTime()/1000);
        channel.send(`<@&${game.notifyRoleId}> A game is coming up: ${game.eventName} at <t:${eventDateUnix}:R>`);
        await gamesCollection.updateOne(
          { eventId: game.eventId },
          { $set: { notified: true } }
        );
      }
    }
  } catch (error) {
    console.error('Error checking database for notifications:', error);
  }
}

client.login(DISCORD_TOKEN);
