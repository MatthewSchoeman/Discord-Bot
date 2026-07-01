require('dotenv').config();
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { runAutoPick, checkReminders } = require('./utils/scheduler');

// ─── Config ───────────────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; 
const GAMING_CHANNEL_ID = process.env.GAMING_CHANNEL_ID; 
const REMINDER_CHANNEL_ID = process.env.REMINDER_CHANNEL_ID;
const TIMEZONE = process.env.TIMEZONE || 'Africa/Johannesburg';

// ─── Bot Client ───────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // needed to read channel members
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();
const commands = [];

// ─── Load Commands Dynamically ────────────────────────────────────────────────
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const folderPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// ─── Register Slash Commands ──────────────────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registering slash commands…');
    // Guild-scoped = instant; swap to Routes.applicationCommands for global (1hr delay)
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('Slash commands registered ✓');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

client.once('ready', () => {
  console.log(`✅  Logged in as ${client.user.tag}`);
  console.log('\n🤖 Loaded commands:');
  client.commands.forEach(cmd => {
    console.log(`   /${cmd.data.name} - ${cmd.data.description}`);
  });
  console.log('');

  // Schedule monthly auto-pick: runs at 20:00 (8 PM) on the 1st day of every month
  cron.schedule('0 20 1 * *', () => {
    runAutoPick(client);
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log(`📅 Scheduled automatic monthly game pick (0 20 1 * * in ${TIMEZONE}).`);

  // Check reminders every 15 seconds
  setInterval(() => {
    checkReminders(client);
  }, 15 * 1000);
  console.log('⏰ Started reminder check interval (15 seconds).');
});

// Prevent unhandled errors from crashing the bot
client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

// ─── Interaction Handler ──────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const isReminderCommand = interaction.commandName.startsWith('remind');

  if (isReminderCommand && interaction.channelId !== REMINDER_CHANNEL_ID) {
    return interaction.reply({
      content: `❌ Reminder commands can only be used in <#${REMINDER_CHANNEL_ID}>.`,
      ephemeral: true
    });
  }

  if (!isReminderCommand && interaction.channelId !== GAMING_CHANNEL_ID) {
    return interaction.reply({
      content: `❌ My commands can only be used in <#${GAMING_CHANNEL_ID}>.`,
      ephemeral: true
    });
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Error executing command:', error);
    const replyPayload = { content: '❌ There was an error while executing this command!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyPayload);
    } else {
      await interaction.reply(replyPayload);
    }
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();