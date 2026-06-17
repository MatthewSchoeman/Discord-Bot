const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, saveData } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games-clear')
    .setDescription('Clear the entire game pool (admin only)'),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const data = loadData();
    if (!data[guildId]) data[guildId] = { games: [] };

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
};
