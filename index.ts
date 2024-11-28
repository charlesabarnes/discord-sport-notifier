import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import * as dotenv from 'dotenv';
import { MongoClient, Db, Collection } from 'mongodb';
import { readFileSync } from 'fs';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SPORTSDB_API_KEY = process.env.SPORTSDB_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI; // Your MongoDB connection string
const DB_NAME = process.env.DB_NAME || 'sportsdb';
const COLLECTION_NAME =  process.env.COLLECTION_NAME || 'games';


interface Config {
  teams?: ConfigTeam[];
  leagues?: ConfigLeague[];
  notifyRole: string;
}

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
  checkUpcomingGames()
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

        const gameDate = new Date(event.dateEvent + ' ' + event.strTime);
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
        const gameDate = new Date(event.dateEvent + ' ' + event.strTime);
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
