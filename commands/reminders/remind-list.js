const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadReminders } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-list')
    .setDescription('List all your active reminders'),
  async execute(interaction) {
    const reminders = loadReminders();
    const userReminders = reminders
      .filter(r => r.userId === interaction.user.id)
      .sort((a, b) => new Date(a.dueTime) - new Date(b.dueTime));

    if (userReminders.length === 0) {
      return interaction.reply({
        content: '📋 You have no active reminders. Set one with `/remind-set`.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2) // blue
      .setTitle('📋 Your Active Reminders')
      .setDescription('Use `/remind-cancel <index>` to delete a reminder.')
      .setTimestamp();

    userReminders.forEach((r, i) => {
      const targetUnix = Math.floor(new Date(r.dueTime).getTime() / 1000);
      embed.addFields({
        name: `${i + 1}. ${r.message}`,
        value: `Due: <t:${targetUnix}:F> (<t:${targetUnix}:R>)`,
        inline: false
      });
    });

    return interaction.reply({ embeds: [embed] });
  }
};
