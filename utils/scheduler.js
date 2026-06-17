const { EmbedBuilder } = require('discord.js');
const { loadData, loadReminders, saveReminders } = require('./db');
const { assignGamesRandomly } = require('./helpers');

const GUILD_ID = process.env.GUILD_ID;
const GAMING_CHANNEL_ID = process.env.GAMING_CHANNEL_ID;

async function runAutoPick(client) {
  console.log('Running automatic game pick...');
  const data = loadData();
  const guildId = GUILD_ID;
  if (!data[guildId]) data[guildId] = { games: [] };
  const pool = data[guildId].games;

  if (pool.length === 0) {
    console.log('Auto-pick skipped: No games in the pool.');
    return;
  }

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) {
      console.error(`Auto-pick error: Guild with ID ${GUILD_ID} not found.`);
      return;
    }

    const channel = await guild.channels.fetch(GAMING_CHANNEL_ID);
    if (!channel) {
      console.error(`Auto-pick error: Channel with ID ${GAMING_CHANNEL_ID} not found.`);
      return;
    }

    await guild.members.fetch(); // ensure cache is populated

    const visibleMembers = guild.members.cache.filter(member => {
      if (member.user.bot) return false;
      const perms = channel.permissionsFor(member);
      return perms && perms.has('ViewChannel');
    });

    if (visibleMembers.size === 0) {
      console.log('Auto-pick skipped: No non-bot members found in the channel.');
      return;
    }

    const assignments = assignGamesRandomly([...visibleMembers.values()], pool);

    const lines = Object.entries(assignments)
      .map(([userId, game]) => `<@${userId}> → **${game}**`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xeb459e) // pink
      .setTitle('🎲 Monthly Game Assignments')
      .setDescription(lines)
      .setFooter({ text: `Picked from ${pool.length} game(s) · ${visibleMembers.size} member(s)` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log('Auto-pick executed successfully.');
  } catch (err) {
    console.error('Error during auto-pick execution:', err);
  }
}

async function checkReminders(client) {
  const reminders = loadReminders();
  if (reminders.length === 0) return;

  const now = new Date();
  const due = [];
  const remaining = [];

  for (const r of reminders) {
    if (new Date(r.dueTime) <= now) {
      due.push(r);
    } else {
      remaining.push(r);
    }
  }

  if (due.length === 0) return;

  saveReminders(remaining);

  for (const reminder of due) {
    try {
      const channel = await client.channels.fetch(reminder.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c) // yellow
          .setTitle('🔔 Reminder!')
          .setDescription(`**${reminder.message}**`)
          .setFooter({ text: `Set <t:${Math.floor(new Date(reminder.createdAt).getTime() / 1000)}:R>` })
          .setTimestamp();

        await channel.send({
          content: `⏰ <@${reminder.userId}>`,
          embeds: [embed],
        });
        console.log(`Delivered reminder ${reminder.id} to channel ${reminder.channelId}`);
      } else {
        throw new Error('Channel not found or not accessible');
      }
    } catch (err) {
      console.warn(`Could not send reminder in channel ${reminder.channelId}, trying Direct Message. Error:`, err.message);
      try {
        const user = await client.users.fetch(reminder.userId);
        if (user) {
          const embed = new EmbedBuilder()
            .setColor(0xfee75c) // yellow
            .setTitle('🔔 Reminder!')
            .setDescription(`**${reminder.message}**`)
            .setFooter({ text: `Set <t:${Math.floor(new Date(reminder.createdAt).getTime() / 1000)}:R>` })
            .setTimestamp();

          await user.send({
            content: `⏰ Hello! Here is your reminder:`,
            embeds: [embed],
          });
          console.log(`Delivered reminder ${reminder.id} via DM to user ${reminder.userId}`);
        }
      } catch (dmErr) {
        console.error(`Failed to send reminder ${reminder.id} via DM to user ${reminder.userId}:`, dmErr);
      }
    }

    // Edit the original "Reminder Set" message to remove the live relative timestamp
    if (reminder.messageId) {
      try {
        const origChannel = await client.channels.fetch(reminder.channelId);
        if (origChannel) {
          const origMessage = await origChannel.messages.fetch(reminder.messageId);
          if (origMessage && origMessage.embeds.length > 0) {
            const targetUnix = Math.floor(new Date(reminder.dueTime).getTime() / 1000);
            const updatedEmbed = new EmbedBuilder()
              .setColor(0x95a5a6) // grey — delivered
              .setTitle('✅ Reminder Delivered')
              .setDescription(`Reminded you about:\n**${reminder.message}**`)
              .addFields(
                { name: 'Time', value: `<t:${targetUnix}:F>`, inline: true },
                { name: 'Status', value: '✅ Delivered', inline: true }
              )
              .setFooter({ text: 'This reminder has been delivered' })
              .setTimestamp();
            await origMessage.edit({ embeds: [updatedEmbed] });
          }
        }
      } catch (editErr) {
        console.warn(`Could not edit original reminder message ${reminder.messageId}:`, editErr.message);
      }
    }
  }
}

module.exports = {
  runAutoPick,
  checkReminders
};
