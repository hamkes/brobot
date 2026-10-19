const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Guild } = require('../../db');
const { errorEmbed, successEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('color')
    .setDescription('Pick a color role for yourself')
    .addIntegerOption((opt) =>
      opt.setName('number').setDescription('Color number from /colors').setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const number = interaction.options.getInteger('number');

    const settings = await Guild.findOne({ guildId: interaction.guild.id }).lean();
    const palette = (settings?.colorRoles || [])
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter(Boolean);

    if (!palette.length) {
      return interaction.reply({ embeds: [errorEmbed('No color roles are configured in this server.')], flags: MessageFlags.Ephemeral });
    }

    const role = palette[number - 1];
    if (!role) {
      return interaction.reply({ embeds: [errorEmbed(`Invalid number — pick between **1** and **${palette.length}**.`)], flags: MessageFlags.Ephemeral });
    }
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
      return interaction.reply({ embeds: [errorEmbed('I cannot manage that role (it is above me).')], flags: MessageFlags.Ephemeral });
    }

    const current = interaction.member.roles.cache.filter((r) => palette.some((p) => p.id === r.id) && r.id !== role.id);
    for (const old of current.values()) {
      await interaction.member.roles.remove(old, 'Brobot • Color role swap').catch(() => null);
    }
    await interaction.member.roles.add(role, 'Brobot • Color role').catch(() => null);

    await interaction.reply({ embeds: [successEmbed(`🎨 Your color is now **${role.name}**.`)], flags: MessageFlags.Ephemeral });
  }
};
