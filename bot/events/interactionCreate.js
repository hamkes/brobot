const { MessageFlags } = require('discord.js');
const { handleTicketButton } = require('../systems/tickets');
const { errorEmbed } = require('../utils/helpers');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) return handleCommand(interaction);
      if (interaction.isButton()) return handleButton(interaction);
      if (interaction.isStringSelectMenu()) return handleSelect(interaction);
    } catch (err) {
      logger.error(`interactionCreate failed: ${err.message}`);
      replyError(interaction, 'Something went wrong while handling that interaction.');
    }
  }
};

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error(`Command /${interaction.commandName} failed: ${err.stack || err.message}`);
    await replyError(interaction, 'There was an error while executing this command.');
  }
}

async function handleButton(interaction) {
  const [scope] = interaction.customId.split(':');

  if (scope === 'ticket') return handleTicketButton(interaction);

  if (scope === 'selfrole') {
    const roleId = interaction.customId.split(':')[1];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: 'That role no longer exists.', ephemeral: true });
    }
    if (interaction.guild.members.me.roles.highest.position <= role.position) {
      return interaction.reply({ content: 'I cannot manage that role (it is above me).', ephemeral: true });
    }

    const has = interaction.member.roles.cache.has(role.id);
    if (has) {
      await interaction.member.roles.remove(role, 'Brobot • Self role');
      return interaction.reply({ content: `➖ Removed **${role.name}**`, ephemeral: true });
    }
    await interaction.member.roles.add(role, 'Brobot • Self role');
    return interaction.reply({ content: `➕ Added **${role.name}**`, ephemeral: true });
  }

  if (scope === 'embed') {
    return interaction.reply({ content: 'Embed builder preview — configure from the dashboard.', ephemeral: true });
  }
}

async function handleSelect(interaction) {
  if (interaction.customId === 'colorrole') {
    const roleId = interaction.values[0];
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({ content: 'That role no longer exists.', ephemeral: true });
    }

    const { Guild } = require('../db');
    const settings = await Guild.findOne({ guildId: interaction.guild.id });
    const palette = settings?.colorRoles || [];

    const current = interaction.member.roles.cache.filter((r) => palette.includes(r.id));
    for (const old of current.values()) {
      await interaction.member.roles.remove(old, 'Brobot • Color role swap').catch(() => null);
    }

    await interaction.member.roles.add(role, 'Brobot • Color role').catch(() => null);
    return interaction.reply({ content: `🎨 Your color is now **${role.name}**`, ephemeral: true });
  }
}

async function replyError(interaction, text) {
  const payload = { embeds: [errorEmbed(text)], flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }
}
