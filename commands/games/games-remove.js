const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData, saveData } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games-remove')
    .setDescription('Remove a game from the pool')
    .addStringOption(opt =>
      opt.setName('game').setDescription('Exact name of the game to remove').setRequired(true)
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const data = loadData();
    if (!data[guildId]) data[guildId] = { games: [] };
    const pool = data[guildId].games;

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
};
