# 🎮 Discord Game Picker Bot

Randomly assigns games to every member in a channel — perfect for picking what to play together.

---

## Setup Guide

### 1. Create the Bot on Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and click **New Application**.
2. Give it a name (e.g. *GamePicker*) and click **Create**.
3. In the left sidebar, click **Bot** → **Add Bot** → confirm.
4. Under **Token**, click **Reset Token**, then copy it — this is your `DISCORD_TOKEN`.
5. Enable these **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. In the left sidebar, click **OAuth2 → URL Generator**.
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Read Message History`, `View Channels`
7. Copy the generated URL, open it in your browser, and invite the bot to your server.

### 2. Get Your IDs

Right-click your server icon → **Copy Server ID** → this is `GUILD_ID`.
Go back to the Developer Portal → your application → **General Information** → copy **Application ID** → this is `CLIENT_ID`.

> **Enable Developer Mode** in Discord settings (Advanced → Developer Mode) to right-click and copy IDs.

### 3. Configure the Bot

```bash
# Clone / download the bot files, then:
cd discord-game-picker-bot
cp .env.example .env
```

Edit `.env`:
```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id_here
GUILD_ID=your_discord_server_id_here
```

### 4. Install & Run

```bash
npm install
npm start
```

You should see:
```
Registering slash commands…
Slash commands registered ✓
✅ Logged in as GamePicker#1234
```

---

## Commands

| Command | Description |
|---|---|
| `/games-add games:Minecraft, Valorant` | Add one or more games (comma-separated) |
| `/games-remove game:Minecraft` | Remove a specific game |
| `/games-list` | Show all games in the pool |
| `/games-clear` | Clear the pool (requires Manage Messages) |
| `/pick` | Assign a random game to every member who can see this channel |

---

## How `/pick` Works

- Looks at all **non-bot members** who have permission to view the current channel.
- Shuffles the game pool and assigns one game per person.
- If there are more people than games, games repeat (but are still randomized).

---

## Keeping the Bot Running

For production, use a process manager so the bot restarts on crashes:

```bash
npm install -g pm2
pm2 start bot.js --name game-picker
pm2 save
pm2 startup   # follow the printed instructions
```

Or deploy to a free host like [Railway](https://railway.app) or [Render](https://render.com).
