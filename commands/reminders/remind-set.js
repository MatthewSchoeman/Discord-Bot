const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const chrono = require('chrono-node');
const { loadReminders, saveReminders } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-set')
    .setDescription('Set a new reminder')
    .addStringOption(opt =>
      opt.setName('message').setDescription('What to remind you of').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('time').setDescription('When to remind you (e.g. "in 10 minutes", "tomorrow at 3 PM")').setRequired(true)
    ),
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const timeStr = interaction.options.getString('time');

    const parsedDate = chrono.parseDate(timeStr, new Date());

    if (!parsedDate) {
      return interaction.reply({
        content: `❌ I couldn't parse the time **"${timeStr}"**. Try something like "in 5 minutes", "tomorrow at 3 PM", or "at 18:00".`,
        ephemeral: true,
      });
    }

    if (parsedDate.getTime() <= Date.now()) {
      return interaction.reply({
        content: `❌ The parsed time (**${parsedDate.toLocaleString()}**) is in the past. Please specify a future time.`,
        ephemeral: true,
      });
    }

    const reminders = loadReminders();
    const reminderId = Math.random().toString(36).substring(2, 9);

    const newReminder = {
      id: reminderId,
      userId: interaction.user.id,
      channelId: interaction.channelId,
      message: message,
      dueTime: parsedDate.toISOString(),
      createdAt: new Date().toISOString(),
    };

    reminders.push(newReminder);
    saveReminders(reminders);

    const targetUnix = Math.floor(parsedDate.getTime() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x57f287) // green
      .setTitle('⏰ Reminder Set')
      .setDescription(`I will remind you about:\n**${message}**`)
      .addFields(
        { name: 'Time', value: `<t:${targetUnix}:F>`, inline: true },
        { name: 'Relative', value: `<t:${targetUnix}:R>`, inline: true }
      )
      .setFooter({ text: `Use /remind-list to see your active reminders` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
};
