import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import { readFileSync } from 'fs';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TV_DB_API_KEY = process.env.TV_DB_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI; // Your MongoDB connection string
const DB_NAME = process.env.DB_NAME || 'sportsdb';
const COLLECTION_NAME =  process.env.COLLECTION_NAME || 'games';


interface Config {
  teams: ConfigTeam[];
  notifyRole: string;
}

interface ConfigTeam {
  teamName: string;
  notifyRoleId: string;
  channelId: string;
}

type Game = {
  eventId: string;
  eventName: string;
  eventDate: Date;
  notified: boolean;
} & ConfigTeam;

const config: Config = JSON.parse(readFileSync('config.json', 'utf8'));


let db: Db;
let gamesCollection: Collection<Game>;

const mongoClient = new MongoClient(MONGODB_URI!);

async function connectToDatabase() {
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  gamesCollection = db.collection(COLLECTION_NAME);
  console.log('Connected to MongoDB');
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  await connectToDatabase();
  scheduleDailyCheck();
  setInterval(checkDatabaseForNotifications, 300000); // Check every 5 minutes
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

  const promises = config.teams.map(async (team) => {
    await fetchUpcomingGames(team.teamName, team.notifyRoleId, team.channelId);
  });

  await Promise.all(promises);
}

async function fetchUpcomingGames(teamId: string, ...args: any[]) {
  try {
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/${TV_DB_API_KEY}/eventsnext.php?id=${teamId}`);
    const responseJson = await response.json();
    const events = responseJson.events;

    if (events && events.length > 0) {
      for (const event of events) {
        const gameDate = new Date(event.dateEvent + ' ' + event.strTime);
        const game = {
          eventId: event.idEvent,
          eventName: event.strEvent,
          eventDate: gameDate,
          notified: false,
          teamId,
          ...args,
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

  try {
    const games = await gamesCollection.find({ eventDate: { $gte: tenMinutesAgo, }, notified: false }).toArray();
    for (const game of games) {
      const channel = client.channels.cache.get(game.channelId!) as TextChannel;
      if (channel) {
        channel.send(`<@&${game.notifyRoleId}> A game is coming up: ${game.eventName} on ${game.eventDate.toDateString()} at ${game.eventDate.toTimeString()}`);
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