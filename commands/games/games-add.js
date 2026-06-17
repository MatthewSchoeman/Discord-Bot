const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, saveData } = require('../../utils/db');
const { truncateList } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games-add')
    .setDescription('Add one or more games to the pool')
    .addStringOption(opt =>
      opt
        .setName('games')
        .setDescription('Comma-separated list of game names, e.g. Minecraft, Fortnite, Valorant')
        .setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const data = loadData();
    if (!data[guildId]) data[guildId] = { games: [] };
    const pool = data[guildId].games;

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
};
