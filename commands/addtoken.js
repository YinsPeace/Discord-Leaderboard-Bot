const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { db: pool } = require('../database');

module.exports = {
  name: 'addtoken',
  description: 'Add Token score to a user',
  async execute(message, args, data) {
    const { tokenScores, sandPriceUSD } = data;

    if (!message.member.permissions.has[PermissionsBitField.Flags.ADMINISTRATOR] && message.member.id !== message.guild.ownerId) {
      const noPermissionEmbed = new EmbedBuilder()
        .setDescription('You do not have permission to use this command.')
        .setColor('#FF0000');
      return message.channel.send({ embeds: [noPermissionEmbed] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      const mentionUserEmbed = new EmbedBuilder()
        .setDescription('Please mention a user to add Token score.')
        .setColor('#FFFF00');
      return message.channel.send({ embeds: [mentionUserEmbed] });
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      const invalidAmountEmbed = new EmbedBuilder()
        .setDescription('Please enter a valid amount of Token score to add.')
        .setColor('#FFFF00');
      return message.channel.send({ embeds: [invalidAmountEmbed] });
    }

    const userId = targetUser.id;
    if (!tokenScores[userId]) {
      tokenScores[userId] = 0;
    }
    tokenScores[userId] += amount;

    // Save the updated scores to the token.db
    await pool.query('INSERT INTO token_scores (user_id, score) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET score = EXCLUDED.score', [userId, tokenScores[userId]]);

    const tokenEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Token');
    const tokenToSand = 0.16;
    const tokenValueUSD = tokenScores[userId] * tokenToSand * sandPriceUSD;
    const successEmbed = new EmbedBuilder()
      .setDescription(`Added ${amount} ${tokenEmoji} Tokens to ${targetUser.tag}. New balance: **${tokenScores[userId]}** ${tokenEmoji} ($${tokenValueUSD.toFixed(2)} USD).`)
      .setColor('#00FF00');
    message.channel.send({ embeds: [successEmbed] });
  },
};