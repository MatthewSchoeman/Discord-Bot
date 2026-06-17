const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadData } = require('../../utils/db');
const { assignGamesRandomly } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Randomly assign a game to every member currently in this text channel'),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const data = loadData();
    if (!data[guildId]) data[guildId] = { games: [] };
    const pool = data[guildId].games;

    if (pool.length === 0) {
      return interaction.reply({
        content: '❌ No games in the pool yet! Add some with `/games-add`.',
        ephemeral: true,
      });
    }

    await interaction.deferReply(); // fetching members can take a moment

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
};
