const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { db: pool } = require('../database');

module.exports = {
  name: 'deltoken',
  description: 'Remove Token score from a user',
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
        .setDescription('Please mention a user to remove Token score from.')
        .setColor('#FFFF00');
      return message.channel.send({ embeds: [mentionUserEmbed] });
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
      const invalidAmountEmbed = new EmbedBuilder()
        .setDescription('Please enter a valid amount of Token score to remove.')
        .setColor('#FFFF00');
      return message.channel.send({ embeds: [invalidAmountEmbed] });
    }

    const userId = targetUser.id;
    if (!tokenScores[userId]) {
      tokenScores[userId] = 0;
    }

    const newScore = Math.max(0, tokenScores[userId] - amount);
    tokenScores[userId] = newScore;
    // Update the user's score in the PostgreSQL database
    await pool.query('UPDATE token_scores SET score = $1 WHERE user_id = $2', [newScore, userId]);

    const tokenEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Token');
    const tokenToSand = 0.16;
    const tokenValueUSD = newScore * tokenToSand * sandPriceUSD;
        
    const successEmbed = new EmbedBuilder()
      .setDescription(`Removed ${amount} ${tokenEmoji} Tokens from ${targetUser.tag}. Their new balance is **${newScore}** ${tokenEmoji} ($${tokenValueUSD.toFixed(2)}).`)
      .setColor('#00FF00');
    message.channel.send({ embeds: [successEmbed] });
  },
};