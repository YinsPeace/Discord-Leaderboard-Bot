const { EmbedBuilder } = require('discord.js');
const { db: pool } = require('../database');

module.exports = {
  name: 'top',
  description: 'Display top 20 Token holders',
  async execute(message) {
    try {
      const res = await pool.query('SELECT user_id, score FROM token_scores ORDER BY score DESC LIMIT 20');

      const topEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Top 20 Token Holders')
        .setDescription('Here are the top 20 Token holders:');

      for (let i = 0; i < res.rows.length; i++) {
        const user = await message.client.users.fetch(res.rows[i].user_id);
        topEmbed.addFields({ name: `${i + 1}. ${user.username}`, value: `${res.rows[i].score} Tokens` });
      }

      message.channel.send({ embeds: [topEmbed] });
    } catch (error) {
      console.error('Error in top command:', error);
      message.reply('An error occurred while fetching the top Token holders.');
    }
  },
};
