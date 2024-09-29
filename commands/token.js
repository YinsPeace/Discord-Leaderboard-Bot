const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'token',
  description: 'Check a user\'s Token score',
  execute(message, data) {
    const { tokenScores, sandPriceUSD } = data;

    const user = message.mentions.users.first() || message.author;
    const userId = user.id;
    const score = tokenScores[userId] || 0;
    
    const tokenEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Token');
    const tokenToSand = 0.16;
    const tokenValueUSD = score * tokenToSand * sandPriceUSD;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setDescription(`${user.username} has **${score}** ${tokenEmoji} Tokens ($${tokenValueUSD.toFixed(2)} USD)`);

    message.channel.send({ embeds: [embed] });
  },
};