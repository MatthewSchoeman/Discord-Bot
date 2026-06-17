const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadReminders, saveReminders } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-cancel')
    .setDescription('Cancel an active reminder')
    .addIntegerOption(opt =>
      opt.setName('index').setDescription('The reminder index from /remind-list to cancel').setRequired(true)
    ),
  async execute(interaction) {
    const index = interaction.options.getInteger('index');
    const reminders = loadReminders();

    const userReminders = reminders
      .filter(r => r.userId === interaction.user.id)
      .sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime));

    if (index < 1 || index > userReminders.length) {
      return interaction.reply({
        content: `❌ Invalid index. You only have **${userReminders.length}** active reminder(s). Use \`/remind-list\` to view them.`,
        ephemeral: true,
      });
    }

    const targetReminder = userReminders[index - 1];
    const mainIndex = reminders.findIndex(r => r.id === targetReminder.id);

    if (mainIndex === -1) {
      return interaction.reply({
        content: `❌ Could not find the selected reminder.`,
        ephemeral: true,
      });
    }

    const removed = reminders.splice(mainIndex, 1)[0];
    saveReminders(reminders);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245) // red
          .setDescription(`🗑️ Cancelled reminder: **${removed.message}**`),
      ],
    });
  }
};
