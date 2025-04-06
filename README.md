# Discord Sport Notifier

This project is a Discord bot that notifies specific roles when a sports game is coming up. The bot fetches upcoming game data from the Sports DB API and sends notifications to designated channels in your Discord server.

## Features

- Fetches upcoming games for specified teams from the Sports DB API.
- Stores game information in a MongoDB database.
- Sends notifications to specific Discord channels and roles about upcoming games.
- Checks for new games daily and for notifications every minute.
- Configuration UI for easy management of teams and leagues by environment.

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
    # Bot Authentication
    DISCORD_TOKEN=your-discord-bot-token
    SPORTSDB_API_KEY=your-tv-db-api-key
    
    # Database Configuration
    MONGODB_URI=your-mongodb-connection-string
    DB_NAME=sportsdb
    COLLECTION_NAME=games
    
    # UI Configuration
    UI_PORT=3000 # Optional, defaults to 3000
    NODE_ENV=production # Optional, defaults to production
    
    # Discord OAuth Integration (OPTIONAL - for enhanced UI with Discord integration)
    DISCORD_CLIENT_ID=your-discord-application-client-id
    DISCORD_CLIENT_SECRET=your-discord-application-client-secret
    DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
    SESSION_SECRET=your-session-secret-key
    ```

3. **Setting up Discord OAuth (OPTIONAL)**
   
   The UI works in two modes:
   - **Basic Mode**: Manual configuration without Discord integration (default)
   - **Enhanced Mode**: Discord OAuth integration for server/role/channel selection

   To enable the enhanced mode with Discord OAuth integration:
   
   1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
   2. Click on "New Application" and name it (e.g., "Sports Notifier")
   3. Navigate to the "OAuth2" section
   4. Add a redirect URL: `http://localhost:3000/auth/discord/callback` (or your custom domain)
   5. Copy the Client ID and Client Secret to your environment variables
   6. Under "Bot" section, enable the following Privileged Gateway Intents:
      - Server Members Intent
      - Message Content Intent
   7. Add the bot to your Discord server with the following permissions:
      - Read Messages/View Channels
      - Send Messages
      - Manage Roles (if you want to automatically create roles)
   
   You can use this URL template to add the bot to your server:
   `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot`
   
   > **Note**: If you don't set up Discord OAuth, the UI will still work in basic mode, allowing you to configure notifications manually.
3. **Build the application**
   ```sh
   npm run build
   ```

4. **Run the bot and configuration UI**
   ```sh
   npm run start:all
   ```

## Configuration UI

The project includes a web-based configuration UI that allows you to manage your team and league notifications. You can access it at `http://localhost:3000` (or your custom port if specified).

### UI Modes

The UI operates in two modes:

1. **Basic Mode** (default): Manual configuration without Discord integration
   - Requires manual entry of Discord IDs (roles, channels)
   - Requires manual entry of team and league IDs from TheSportsDB
   - No login required

2. **Enhanced Mode**: With Discord OAuth integration
   - Login with Discord to select servers, roles, and channels
   - Search for teams and leagues with auto-complete
   - Visual selection of teams and leagues with logos/badges
   - Requires setting up Discord OAuth credentials

> Note: The UI automatically detects if Discord OAuth credentials are available and switches to the appropriate mode.

### Features

The UI allows you to:

- Configure teams and leagues by environment (production, staging, development)
- Add and remove teams to track for notifications
- Add and remove leagues to track for notifications
- Configure channel IDs and role IDs for notifications
- Set excluded words for league events

### Running Just the UI

If you want to run only the configuration UI:

```sh
npm run start:ui
```

### Running Just the Bot

If you want to run only the Discord bot:

```sh
npm run start
```

### Environment-Specific Configuration

The bot supports different configurations for different environments. You can:

1. Switch environments in the UI using the environment selector
2. Run the bot with a specific environment: `NODE_ENV=staging npm run start`
3. Each environment gets its own config file (e.g., `config.staging.json`, `config.development.json`)

## Docker Support

The application can be run using Docker:

```sh
# Using docker-compose
docker-compose up -d

# Or using Docker directly
docker run -d \
  -e DISCORD_TOKEN=your_token \
  -e SPORTSDB_API_KEY=your_key \
  -e MONGODB_URI=your_mongodb_uri \
  -p 3000:3000 \
  -v /path/to/config.json:/app/config.json \
  ghcr.io/charlesabarnes/discord-sport-notifier:latest
```

### Pre-built Docker Images

Pre-built Docker images are available on GitHub Container Registry:

```
ghcr.io/charlesabarnes/discord-sport-notifier:latest
```

## Setting up in Unraid

1. Add the Docker image from GitHub Packages:
   - Repository: `ghcr.io/charlesabarnes/discord-sport-notifier`
   - Tag: `latest`

2. Set the required environment variables in the Unraid Docker template:
   - DISCORD_TOKEN
   - SPORTSDB_API_KEY
   - MONGODB_URI

3. Add volume mappings:
   - Host Path: `/path/to/your/config.json`
   - Container Path: `/app/config.json`

4. Map port 3000 to access the web UI

5. Set container to auto-start and restart policy to "unless-stopped"