import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
import { connectToDatabase, getConfigFromMongoDB, Config, ConfigTeam, ConfigLeague } from './src/models/db';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI; // Your MongoDB connection string
const DB_NAME = process.env.DB_NAME || 'sportsdb';
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'games';

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
  scheduleDailyCheck();
  checkUpcomingGames();
  setInterval(checkDatabaseForNotifications, 60*1000); // Check every 1 minute
});

function scheduleDailyCheck() {
  const now = new Date();
  const nextCheck = new Date();
  nextCheck.setHours(24, 0, 0, 0); // Next midnight

  const timeUntilNextCheck = nextCheck.getTime() - now.getTime();
  setTimeout(() => {
    checkUpcomingGames();
    setInterval(checkUpcomingGames, 86400000); // Every 24 hours after that
  }, timeUntilNextCheck);
}

async function checkUpcomingGames() {

  const teamPromises = (config?.teams || []).map(async (team) => {
    await fetchUpcomingGames(team.teamId, team.notifyRoleId, team.channelId);
  });

  const leaguePromises = (config?.leagues || []).map(async (league) => {
    await fetchUpcomingLeagueEvents(league.leagueId, league.notifyRoleId, league.channelId, league.excludedWords);
  });

  await Promise.all([...teamPromises, ...leaguePromises]);
}

async function fetchUpcomingLeagueEvents(leagueId: string, notifyRoleId: string, leagueChannelId: string, excludedWords?: string[]) {
  try {
    const url = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnextleague.php?id=${leagueId}`;
    const response = await fetch(url);
    const responseJson = await response.json();
    const events = responseJson.events;

    if (events && events.length > 0) {
      for (const event of events) {
        if (excludedWords && excludedWords.length > 0) {
          const excluded = excludedWords.some(word => 
            event.strEvent.toLowerCase().includes(word.toLowerCase())
          );
          if (excluded) {
            console.log(`Excluded event: ${event.strEvent}`);
            continue;
          }
        }

        // Convert date and time to UTC, respecting timezone 
        // Format: 2023-05-25 19:30:00
        const eventDate = event.dateEvent; // YYYY-MM-DD
        const eventTime = event.strTime || '00:00:00'; // HH:MM:SS
        
        // Explicitly add 'Z' to indicate UTC time (Zulu time)
        const gameDate = new Date(`${eventDate}T${eventTime}Z`);
        
        console.log(`Event: ${event.strEvent}, Date string: ${eventDate} ${eventTime}, Parsed date: ${gameDate}`);
        const game = {
          eventId: event.idEvent,
          eventName: event.strEvent,
          eventDate: gameDate,
          notifyRoleId,
          channelId: leagueChannelId,
        };
        await gamesCollection.updateOne(
          { eventId: event.idEvent },
          { $set: game },
          { upsert: true }
        );
      }
    }
  } catch (error) {
    console.error('Error fetching upcoming league events:', error);
  }
}

async function fetchUpcomingGames(teamId: string, notifyRoleId: string, leagueChannelId: string) {
  try {
    const url=`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventsnext.php?id=${teamId}`;
    const response = await fetch(url);
    const responseJson = await response.json();
    const events = responseJson.events;

    if (events && events.length > 0) {
      for (const event of events) {
        // Convert date and time to UTC, respecting timezone 
        // Format: 2023-05-25 19:30:00
        const eventDate = event.dateEvent; // YYYY-MM-DD
        const eventTime = event.strTime || '00:00:00'; // HH:MM:SS
        
        // Explicitly add 'Z' to indicate UTC time (Zulu time)
        const gameDate = new Date(`${eventDate}T${eventTime}Z`);
        
        console.log(`Event: ${event.strEvent}, Date string: ${eventDate} ${eventTime}, Parsed date: ${gameDate}`);
        const game = {
          eventId: event.idEvent,
          eventName: event.strEvent,
          eventDate: gameDate,
          teamId,
          notifyRoleId,
          channelId: leagueChannelId,
        };
        await gamesCollection.updateOne(
          { eventId: event.idEvent },
          { $set: game },
          { upsert: true }
        );
      }
    }
  } catch (error) {
    console.error('Error fetching upcoming games:', error);
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
