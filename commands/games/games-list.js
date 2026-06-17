const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData } = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('games-list')
    .setDescription('Show all games currently in the pool'),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const data = loadData();
    if (!data[guildId]) data[guildId] = { games: [] };
    const pool = data[guildId].games;

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
};
