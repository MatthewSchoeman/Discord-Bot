require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; 
const GAMING_CHANNEL_ID = process.env.GAMING_CHANNEL_ID; 

// File to persist game lists between restarts
const DATA_FILE = './game_data.json';

// ─── Data Helpers ─────────────────────────────────────────────────────────────
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Returns a map of { userId → gameName } assigning one random game per member.
 * Games can repeat if there are more members than games.
 */
function assignGamesRandomly(members, games) {
  const shuffled = [...games].sort(() => Math.random() - 0.5);
  const assignments = {};
  members.forEach((member, i) => {
    assignments[member.id] = shuffled[i % shuffled.length];
  });
  return assignments;
}

/**
 * Fits a list of strings into Discord's 1024-char embed field limit.
 * Shows as many items as possible, then appends "...and X more".
 */
function truncateList(items, limit = 1024) {
  if (!items.length) return 'None';
  const out = [];
  let used = 0;
  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const remaining = items.length - i - 1;
    const overflow = remaining > 0 ? `\n...and ${remaining} more` : '';
    if (used + line.length + 1 + overflow.length > limit) {
      out.push(`...and ${items.length - i} more`);
      break;
    }
    out.push(line);
    used += line.length + 1;
  }
  return out.join('\n');
}

// ─── Slash Command Definitions ────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('games-add')
    .setDescription('Add one or more games to the pool')
    .addStringOption(opt =>
      opt
        .setName('games')
        .setDescription('Comma-separated list of game names, e.g. Minecraft, Fortnite, Valorant')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('games-remove')
    .setDescription('Remove a game from the pool')
    .addStringOption(opt =>
      opt.setName('game').setDescription('Exact name of the game to remove').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('games-list')
    .setDescription('Show all games currently in the pool'),

  new SlashCommandBuilder()
    .setName('games-clear')
    .setDescription('Clear the entire game pool (admin only)'),

  new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Randomly assign a game to every member currently in this text channel'),
].map(cmd => cmd.toJSON());

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

// ─── Bot Client ───────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,   // needed to read channel members
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('clientReady', () => {
  console.log(`✅  Logged in as ${client.user.tag}`);
});

// Prevent unhandled errors from crashing the bot
client.on('error', err => console.error('Discord client error:', err));
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));

// ─── Interaction Handler ──────────────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
      return interaction.reply({
        content: `❌ My commands can only be used in <#${ALLOWED_CHANNEL_ID}>.`,
        ephemeral: true // Only the user who ran the command will see this warning
      });
  }
  const guildId = interaction.guildId;
  const data = loadData();
  if (!data[guildId]) data[guildId] = { games: [] };
  const pool = data[guildId].games;

  // ── /games-add ─────────────────────────────────────────────────────────────
  if (interaction.commandName === 'games-add') {
    const input = interaction.options.getString('games');
    const newGames = input
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);

    const added = [];
    const skipped = [];

    for (const game of newGames) {
      if (pool.map(g => g.toLowerCase()).includes(game.toLowerCase())) {
        skipped.push(game);
      } else {
        pool.push(game);
        added.push(game);
      }
    }

    saveData(data);

    const embed = new EmbedBuilder()
      .setColor(0x57f287) // green
      .setTitle('Game Pool Updated')
      .addFields(
        { name: `Added (${added.length})`, value: truncateList(added), inline: true },
        { name: `Already exists (${skipped.length})`, value: truncateList(skipped), inline: true },
        { name: 'Total in pool', value: `${pool.length}`, inline: false }
      );

    return interaction.reply({ embeds: [embed] });
  }

  // ── /games-remove ──────────────────────────────────────────────────────────
  if (interaction.commandName === 'games-remove') {
    const target = interaction.options.getString('game').trim();
    const idx = pool.findIndex(g => g.toLowerCase() === target.toLowerCase());

    if (idx === -1) {
      return interaction.reply({
        content: `❌ **${target}** isn't in the pool. Use \`/games-list\` to see what's there.`,
        ephemeral: true,
      });
    }

    const removed = pool.splice(idx, 1)[0];
    saveData(data);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245) // red
          .setDescription(`🗑️ Removed **${removed}** from the pool. ${pool.length} game(s) remaining.`),
      ],
    });
  }

  // ── /games-list ────────────────────────────────────────────────────────────
  if (interaction.commandName === 'games-list') {
    if (pool.length === 0) {
      return interaction.reply({
        content: '📋 The game pool is empty. Add games with `/games-add`.',
        ephemeral: true,
      });
    }

    // Split pool into chunks that fit within the 1024-char field limit
    const numbered = pool.map((g, i) => `${i + 1}. ${g}`);
    const chunks = [];
    let current = [];
    let used = 0;
    for (const line of numbered) {
      if (used + line.length + 1 > 1024) {
        chunks.push(current);
        current = [line];
        used = line.length + 1;
      } else {
        current.push(line);
        used += line.length + 1;
      }
    }
    if (current.length) chunks.push(current);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Game Pool')
      .setFooter({ text: `${pool.length} game(s) in pool` });

    chunks.forEach((chunk, i) => {
      embed.addFields({
        name: chunks.length > 1 ? `Games (${i + 1}/${chunks.length})` : 'Games',
        value: chunk.join('\n'),
      });
    });

    return interaction.reply({ embeds: [embed] });
  }

  // ── /games-clear ───────────────────────────────────────────────────────────
  if (interaction.commandName === 'games-clear') {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({
        content: '❌ You need the **Manage Messages** permission to clear the pool.',
        ephemeral: true,
      });
    }

    data[guildId].games = [];
    saveData(data);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c) // yellow
          .setDescription('🧹 Game pool cleared.'),
      ],
    });
  }

  // ── /pick ──────────────────────────────────────────────────────────────────
  if (interaction.commandName === 'pick') {
    if (pool.length === 0) {
      return interaction.reply({
        content: '❌ No games in the pool yet! Add some with `/games-add`.',
        ephemeral: true,
      });
    }

    await interaction.deferReply(); // fetching members can take a moment

    // Fetch all members who have sent messages in this channel recently
    // We read current members of the guild who can see this channel
    const channel = interaction.channel;
    await interaction.guild.members.fetch(); // ensure cache is populated

    const visibleMembers = interaction.guild.members.cache.filter(member => {
      if (member.user.bot) return false; // skip bots
      const perms = channel.permissionsFor(member);
      return perms && perms.has('ViewChannel');
    });

    if (visibleMembers.size === 0) {
      return interaction.editReply('❌ No non-bot members found in this channel.');
    }

    const assignments = assignGamesRandomly([...visibleMembers.values()], pool);

    const lines = Object.entries(assignments)
      .map(([userId, game]) => `<@${userId}> → **${game}**`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xeb459e) // pink
      .setTitle('🎲 Game Assignments')
      .setDescription(lines)
      .setFooter({ text: `Picked from ${pool.length} game(s) · ${visibleMembers.size} member(s)` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  await registerCommands();
  await client.login(TOKEN);
})();