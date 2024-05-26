# Discord Sport Notifier

This project is a Discord bot that notifies specific roles when a sports game is coming up. The bot fetches upcoming game data from the Sports DB API and sends notifications to designated channels in your Discord server.

## Features

- Fetches upcoming games for specified teams from the Sports DB API.
- Stores game information in a MongoDB database.
- Sends notifications to specific Discord channels and roles about upcoming games.
- Checks for new games daily and for notifications every 5 minutes.

## Prerequisites

- Node.js
- Docker (for containerization)
- MongoDB
- A Discord bot token
- An API key for The Sports DB API

## Getting Started

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-username/discord-sport-notifier.git
   cd discord-sport-notifier
   npm install
   ```
2. **Set your environment variables:**
    ```
    DISCORD_TOKEN=your-discord-bot-token
    SPORTSDB_API_KEY=your-tv-db-api-key
    MONGODB_URI=your-mongodb-connection-string
    DB_NAME=sportsdb
    COLLECTION_NAME=games
    ```
3. **Setup config.json**
4. **Run the bot**
    
    ```npm run dev```