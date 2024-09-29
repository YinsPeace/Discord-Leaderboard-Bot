const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'List all available commands',
  execute(message) {
    const commandFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js'));
    const commands = commandFiles.map(file => require(`./${file}`));

    const helpEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Available Commands')
      .setDescription('Here are all the available commands:');

    commands.forEach(command => {
      helpEmbed.addFields({ name: `!${command.name}`, value: command.description || 'No description available' });
    });

    message.channel.send({ embeds: [helpEmbed] });
  },
};
