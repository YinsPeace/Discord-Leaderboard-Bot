require('dotenv').config(); // Load the environment variables from .env file
// Import required classes and functions
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const { db: pool, initDb, testConnection } = require('./database');

const requiredEnvVars = ['DISCORD_TOKEN', 'DATABASE_URL', 'CLIENT_ID', 'GUILD_ID'];

/**
 * Validates required environment variables.
 * @throws {Error} If any required environment variable is missing.
 */
function validateEnv() {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

validateEnv();

(async () => {
  try {
    await testConnection();
    await initDb();
    console.log('Database initialization complete.');

    // Bot setup code goes here (create a new Client instance, define commands, etc.)
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    // Initialize the REST client for registering slash commands later
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    let tokenScores = {};
    let pointScores = {};

    const myRankCommand = {
      name: 'myrank',
      description: 'View your rank details.',
    };

    const giveCommand = {
      name: 'give',
      description: 'Give Points to a user.',
      options: [
        {
          name: 'user',
          description: 'The user to give Points to.',
          type: 6, // Type 6 corresponds to USER
          required: true
        },
        {
          name: 'amount',
          description: 'The amount of Points to give.',
          type: 4, // Type 4 corresponds to INTEGER
          required: true
        }
      ]
    };

    const removeCommand = {
      name: 'remove',
      description: 'Remove Points from a user.',
      options: [
        {
          name: 'user',
          description: 'The user to remove Points from.',
          type: 6, // Type 6 corresponds to USER
          required: true
        },
        {
          name: 'amount',
          description: 'The amount of Points to remove.',
          type: 4, // Type 4 corresponds to INTEGER
          required: true
        }
      ]
    };

    const removeTokenCommand = {
      name: 'removetoken',
      description: 'Remove Tokens from a user.',
      options: [
        {
          name: 'user',
          description: 'The user to remove Tokens from.',
          type: 6, // Type 6 corresponds to USER
          required: true
        },
        {
          name: 'amount',
          description: 'The amount of Tokens to remove.',
          type: 4, // Type 4 corresponds to INTEGER
          required: true
        }
      ]
    };

    const resetCommand = {
      name: 'reset',
      description: 'Reset the leaderboard scores to 0.'
    };

    const resetGameCommand = {
      name: 'resetgame',
      description: 'Reset the game, including updating production runs and leaderboard.'
    };

    const registerWalletCommand = {
      name: 'registerwallet',
      description: 'Register your cryptocurrency wallet address.',
      options: [
        {
          name: 'wallet_address',
          description: 'Your 0x wallet address.',
          type: 3, // Type 3 corresponds to STRING
          required: true
        }
      ]
    };

    const editWalletCommand = {
      name: 'editwallet',
      description: 'Edit your registered cryptocurrency wallet address.',
      options: [
        {
          name: 'wallet_address',
          description: 'Your new 0x wallet address.',
          type: 3,
          required: true
        }
      ]
    };

    const viewWalletCommand = {
      name: 'viewwallet',
      description: 'View the cryptocurrency wallet address of a user.',
      options: [
        {
          name: 'user',
          description: 'The user whose wallet address you want to view.',
          type: 6, // Type 6 corresponds to USER
          required: true
        }
      ]
    };

    const setCommand = {
      name: 'set',
      description: 'Set a new Points score for a user.',
      options: [
        {
          name: 'user',
          description: 'The user to set the score for.',
          type: 6, // Type 6 corresponds to USER
          required: true
        },
        {
          name: 'amount',
          description: 'The new score to set.',
          type: 4, // Type 4 corresponds to INTEGER
          required: true
        }
      ]
    };

    /**
   * Registers slash commands with Discord API.
   * @async
   */
    async function registerSlashCommands() {
      try {
        const requestBody = { body: [
          myRankCommand, 
          giveCommand, 
          removeCommand, 
          resetCommand, 
          resetGameCommand,
          registerWalletCommand,
          editWalletCommand,
          viewWalletCommand,
          removeTokenCommand,
          setCommand
        ] };
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          requestBody,
        );
        console.log('Successfully registered slash commands.');
      } catch (error) {
        console.error('Error registering slash commands:', error);
      }
    }

    registerSlashCommands();

    /**
   * Initializes the point scores table in the database.
   * @async
   */
    async function initPointScoresTable() {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS point_scores (
        user_id BIGINT PRIMARY KEY,
        score NUMERIC NOT NULL
      )
    `);
    }  

    /**
   * Validates the wallet address format.
   * @param {string} address - The wallet address to validate.
   * @returns {boolean} True if the address is valid, false otherwise.
   */
    function validateWalletAddress(address) {
      // Implement the validation logic here
      // For example:
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Export the function so it can be used in other files if needed
    module.exports.validateWalletAddress = validateWalletAddress;

    /**
   * Escapes markdown characters in a given text.
   * @param {string} text - The text to escape.
   * @returns {string} The escaped text.
   */
    function escapeMarkdown(text) {
      // Escapes underscores by placing a backslash before them
      return text.replace(/_/g, '\\_');
    }

    /**
   * Loads point scores from the database into memory.
   * @async
   */
    async function loadPointScores() {
      const res = await pool.query('SELECT user_id, score FROM point_scores');
      res.rows.forEach(row => {
        pointScores[row.user_id] = row.score;
      });
    }
    initPointScoresTable();
    loadPointScores();

    global.challengedUsers = {};
    global.challengers = [];

    client.commands = new Collection();
    const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const command = require(`./commands/${file}`);
      client.commands.set(command.name, command);
    }

    client.on('ready', () => {
      console.log('Bot is online');

      // Set an interval to update the leaderboard every 60 minutes
      setInterval(updateLeaderboard, 60 * 60 * 1000);
    });

    client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isCommand()) return;

        const { commandName, options } = interaction;

        if (commandName === 'myrank') {
          try {  
            await interaction.deferReply({ ephemeral: true });
            const userId = interaction.user.id;
            const userRankDetails = await getUserStats(userId);
      
            console.log('User rank details:', userRankDetails);
      
            const walletRes = await pool.query('SELECT wallet_address FROM user_wallets WHERE user_id = $1', [userId]);
            const walletAddress = walletRes.rowCount > 0 ? walletRes.rows[0].wallet_address : 'Not registered';
      
            const pointScoreRes = await pool.query('SELECT score FROM point_scores WHERE user_id = $1', [userId]);
            const pointScore = pointScoreRes.rowCount > 0 ? pointScoreRes.rows[0].score : 0;
      
            const tokenScoreRes = await pool.query('SELECT score FROM token_scores WHERE user_id = $1', [userId]);
            const tokenScore = tokenScoreRes.rowCount > 0 ? tokenScoreRes.rows[0].score : 0;
      
            const tokenEmoji = client.emojis.cache.get(process.env.TOKEN_EMOJI_ID) || '🪙';
            const pointsEmoji = client.emojis.cache.get(process.env.POINTS_EMOJI_ID) || '💰';
      
            const rankEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle(`${interaction.user.username}'s Rank Details`)
              .addFields(
                { name: 'Wallet Address 🔐', value: ` ${walletAddress}`, inline: false },
                { name: `Tokens ${tokenEmoji}`, value: tokenScore.toString(), inline: true },
              )
              .setDescription(`
              **Current Position**: ${userRankDetails.currentRank}  ${getPositionEmoji(userRankDetails.currentRank)} \n
              **Current Points**: ${pointScore.toString()}  ${pointsEmoji} \n
              **Production Runs**: ${userRankDetails.seasonsPlayed}  :infinity: \n
              **Finished in Top 30**: ${userRankDetails.top30Finishes}  🎖️ \n
              \u200B
            `);
      
            await interaction.editReply({ embeds: [rankEmbed] });
          } catch (error) {
            console.error('Error executing the myrank command:', error);
            await interaction.followUp({ content: 'An error occurred while fetching your rank details.', ephemeral: true });
          }
        } else if (commandName === 'give') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
      
          const targetUser = options.getUser('user', true);
          const amount = options.getInteger('amount', true);
      
          if (amount <= 0) {
            await interaction.reply({ content: 'Please specify a valid amount greater than 0.', ephemeral: true });
            return;
          }
      
          await interaction.deferReply({ ephemeral: false });
      
          try {
            let res = await pool.query('SELECT score FROM point_scores WHERE user_id = $1', [targetUser.id]);
            if (res.rowCount === 0) {
              await pool.query('INSERT INTO point_scores (user_id, score) VALUES ($1, $2)', [targetUser.id, amount]);
            } else {
              await pool.query('UPDATE point_scores SET score = score + $1 WHERE user_id = $2', [amount, targetUser.id]);
            }
            // Ensure to replace 'EMOJI_ID' with the actual ID of your emoji
            const pointsEmoji = client.emojis.cache.get(process.env.POINTS_EMOJI_ID) || '💰';
            await interaction.editReply({ content: `Successfully gave ${amount} Points ${pointsEmoji} to ${targetUser.username}.` });
            await updateLeaderboard();
          } catch (error) {
            console.error('Error executing the give command:', error);
            await interaction.followUp({ content: 'An error occurred while executing the command.', ephemeral: true });
          }
        }
        else if (commandName === 'remove') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          }
      
          const targetUser = options.getUser('user', true);
          const amount = options.getInteger('amount', true);
      
          if (amount <= 0) {
            return interaction.reply({ content: 'Please specify a valid amount greater than 0.', ephemeral: true });
          }
      
          // First, defer the reply if you anticipate the operations might take a while
          await interaction.deferReply({ ephemeral: true });
      
          try {
            let res = await pool.query('SELECT score FROM point_scores WHERE user_id = $1', [targetUser.id]);
            if (res.rowCount === 0 || res.rows[0].score < amount) {
            // User does not exist or does not have enough Points
              await interaction.editReply({ content: `${targetUser.username} does not have enough Points to remove.` });
              return; // Make sure to return here to prevent further execution
            }
      
            // Update the user's score
            await pool.query('UPDATE point_scores SET score = score - $1 WHERE user_id = $2', [amount, targetUser.id]);
      
            // Edit the deferred reply
            await interaction.editReply({ content: `Successfully removed ${amount} Points from ${targetUser.username}.` });
            await updateLeaderboard();
          } catch (error) {
            console.error('Error executing the remove command:', error);
            await interaction.followUp({ content: 'An error occurred while executing the command.', ephemeral: true });
          }
        } else if (commandName === 'removetoken') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          }
      
          const targetUser = options.getUser('user', true);
          const amount = options.getInteger('amount', true);
      
          if (amount <= 0) {
            return interaction.reply({ content: 'Please specify a valid amount greater than 0.', ephemeral: true });
          }
      
          await interaction.deferReply({ ephemeral: true });
      
          try {
            let res = await pool.query('SELECT score FROM token_scores WHERE user_id = $1', [targetUser.id]);
            if (res.rowCount === 0 || res.rows[0].score < amount) {
              await interaction.editReply({ content: `${targetUser.username} does not have enough Tokens to remove.` });
              return;
            }
      
            await pool.query('UPDATE token_scores SET score = score - $1 WHERE user_id = $2', [amount, targetUser.id]);
            await interaction.editReply({ content: `Successfully removed ${amount} Tokens ${client.emojis.cache.get('1092030813782151241')} from ${targetUser.username}.` });
          } catch (error) {
            console.error('Error executing the removetoken command:', error);
            await interaction.followUp({ content: 'An error occurred while executing the command.', ephemeral: true });
          }
        } else if (commandName === 'reset') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
          }
      
          try {
            await pool.query('UPDATE point_scores SET score = 0');
            await updateLeaderboard(); // This will refresh the leaderboard display
            await interaction.reply({ content: 'The leaderboard has been reset.', ephemeral: true });
          } catch (error) {
            console.error('Error executing the reset command:', error);
            if (!interaction.replied) await interaction.reply({ content: 'There was an error executing the reset command.', ephemeral: true });
            else await interaction.followUp({ content: 'There was an error executing the reset command.', ephemeral: true });
          }
        } else if (commandName === 'resetgame') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
      
          await interaction.deferReply({ ephemeral: false });
      
          try {
            const currentRun = await getCurrentProductionRun();
            await incrementProductionRun();
      
            const thread = await client.channels.fetch(process.env.WEEKLY_WINNERS_THREAD_ID);
            if (!thread) {
              await interaction.editReply({ content: 'Could not find the Weekly Winners thread.' });
              return;
            }
      
            await thread.send(`**Weekly Winners - Production Run ${currentRun}:**\n`);
            await pool.query('UPDATE point_scores SET seasons_played = seasons_played + 1 WHERE score > 0');
      
            const top30UsersResult = await pool.query('SELECT user_id FROM point_scores ORDER BY score DESC LIMIT 30');
            for (const user of top30UsersResult.rows) {
              await pool.query('UPDATE point_scores SET top_30_finishes = top_30_finishes + 1 WHERE user_id = $1', [user.user_id]);
            }

            const resetTime = Date.now() + (48 * 60 * 60 * 1000); // 48 hours from now
            await pool.query('UPDATE bot_settings SET setting_value = $1 WHERE setting_key = \'leaderboard_reset_time\'', [resetTime]);
          
            await resetLeaderboardScores();
            await updateLeaderboard();
            await interaction.editReply('Game has been reset, and winners have been posted in the Weekly Winners thread.');
          } catch (error) {
            console.error('Failed to reset game:', error);
            await interaction.followUp({ content: 'There was an error trying to reset the game.', ephemeral: true });
          }
        } else if (commandName === 'registerwallet') {
          const walletAddress = options.getString('wallet_address', true);
        
          try {
          // Insert the new wallet address into the database
            await pool.query('INSERT INTO user_wallets (user_id, wallet_address) VALUES ($1, $2)', [interaction.user.id, walletAddress]);
            interaction.reply({ content: 'Your wallet address has been registered.', ephemeral: true });
          } catch (error) {
            console.error('Error in registerwallet command:', error);
            interaction.reply({ content: 'An error occurred while registering your wallet address.', ephemeral: true });
          }
        } else if (commandName === 'editwallet') {
          const walletAddress = options.getString('wallet_address', true);
        
          try {
          // Update the existing wallet address in the database
            await pool.query('UPDATE user_wallets SET wallet_address = $1 WHERE user_id = $2', [walletAddress, interaction.user.id]);
            interaction.reply({ content: 'Your wallet address has been updated.', ephemeral: true });
          } catch (error) {
            console.error('Error in editwallet command:', error);
            interaction.reply({ content: 'An error occurred while updating your wallet address.', ephemeral: true });
          }
        } else if (interaction.commandName === 'viewwallet') {
          await interaction.deferReply({ ephemeral: true });
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You do not have permission to use this command.' });
          }
      
          const targetUser = interaction.options.getUser('user', true);
      
          try {
          // Fetch the rank details, scores, and wallet address for the target user
            const userRankDetails = await getUserStats(targetUser.id);
            const walletRes = await pool.query('SELECT wallet_address FROM user_wallets WHERE user_id = $1', [targetUser.id]);
            const walletAddress = walletRes.rowCount > 0 ? walletRes.rows[0].wallet_address : 'Not registered';
            const pointScoreRes = await pool.query('SELECT score FROM point_scores WHERE user_id = $1', [targetUser.id]);
            const pointScore = pointScoreRes.rowCount > 0 ? pointScoreRes.rows[0].score : 0;
            const tokenScoreRes = await pool.query('SELECT score FROM token_scores WHERE user_id = $1', [targetUser.id]);
            const tokenScore = tokenScoreRes.rowCount > 0 ? tokenScoreRes.rows[0].score : 0;
            const tokenEmoji = client.emojis.cache.get(process.env.TOKEN_EMOJI_ID);
            const pointEmoji = client.emojis.cache.get(process.env.POINTS_EMOJI_ID);
            // Create an embed similar to the myrank command for the target user
            const rankEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle(`${targetUser.username}'s Rank Details`)
              .addFields(
                { name: 'Wallet Address 🔐', value: ` ${walletAddress}`, inline: false },
                { name: `Tokens ${tokenEmoji ? tokenEmoji.toString() : ' '}`, value: tokenScore.toString(), inline: true },
              )
              .setDescription(`
              **Current Position**: ${userRankDetails.currentRank}  ${getPositionEmoji(userRankDetails.currentRank)} \n
              **Current Points**: ${pointScore.toString()}  ${pointEmoji ? pointEmoji.toString() : ' '} \n
              **Production Runs**: ${userRankDetails.seasonsPlayed}  :infinity: \n
              **Finished in Top 30**: ${userRankDetails.top30Finishes}  🎖️ \n
              \u200B
            `);
      
            // Edit the initial reply with the rank details embed for the target user
            await interaction.editReply({ embeds: [rankEmbed] });
          } catch (error) {
            console.error('Error in viewwallet command:', error);
            await interaction.editReply({ content: 'An error occurred while fetching the rank details.', ephemeral: true });
          }
        } else if (commandName === 'set') {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
            return;
          }
    
          const targetUser = options.getUser('user', true);
          const newScore = options.getInteger('amount', true);
    
          if (newScore < 0) {
            await interaction.reply({ content: 'Please specify a valid score greater than or equal to 0.', ephemeral: true });
            return;
          }
    
          await interaction.deferReply({ ephemeral: false });
    
          try {
            const res = await pool.query('SELECT score FROM point_scores WHERE user_id = $1', [targetUser.id]);
            if (res.rowCount > 0 && newScore <= res.rows[0].score) {
              await interaction.editReply({ content: `The new Points score must be higher than the current score. Current score: ${res.rows[0].score}.`, embeds: [] });
              return;
            }
    
            if (res.rowCount === 0) {
              await pool.query('INSERT INTO point_scores (user_id, score) VALUES ($1, $2)', [targetUser.id, newScore]);
            } else {
              await pool.query('UPDATE point_scores SET score = $1 WHERE user_id = $2', [newScore, targetUser.id]);
            }
    
            const confirmEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle('Points Set')
              .setDescription(`Successfully set ${targetUser.username}'s new Points score to ${newScore}.`);
    
            await interaction.editReply({ embeds: [confirmEmbed] });
            await updateLeaderboard();
          } catch (error) {
            console.error('Error executing the set command:', error);
            await interaction.followUp({ content: 'An error occurred while executing the command.', ephemeral: true });
          }
        }
      } catch (error) {
        console.error('An error occurred while handling the interaction:', error);
  
        // Safely check if a reply has been sent or interaction has been deferred
        if (!interaction.replied && !interaction.deferred) {
        // Reply to the user that an error occurred if the interaction hasn't been replied to or deferred
          await interaction.reply({ content: 'An error occurred while processing your command. Please try again later.', ephemeral: true }).catch(console.error);
        } else {
        // If a reply has been sent or deferred, use followUp to inform the user about the error
          await interaction.followUp({ content: 'An error occurred while finalizing your request. Please try again later.', ephemeral: true }).catch(console.error);
        }
      }
    });


    /**
   * Retrieves the current production run number from the database.
   * @async
   * @returns {number} The current production run number.
   */
    async function getCurrentProductionRun() {
      const result = await pool.query(`
      SELECT setting_value FROM bot_settings WHERE setting_key = 'production_run';
    `);
      // Convert the setting_value to an integer if it exists, or default to 1 if not found
      return result.rows.length > 0 ? parseInt(result.rows[0].setting_value, 10) : 1;
    }

    /**
   * Updates the leaderboard message ID in the database.
   * @async
   * @param {string} newMessageId - The new message ID to store.
   */
    async function updateLeaderboardMessageId(newMessageId) {
      await pool.query(`
      INSERT INTO bot_settings (setting_key, setting_value)
      VALUES ('leaderboard_message_id', $1)
      ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
    `, [newMessageId]);
    }

    /**
   * Fetches the stored leaderboard message ID from the database.
   * @async
   * @returns {string|null} The stored message ID, or null if not found.
   */
    async function fetchLeaderboardMessageId() {
      const result = await pool.query(`
      SELECT setting_value FROM bot_settings WHERE setting_key = 'leaderboard_message_id';
    `);
      return result.rows.length > 0 ? result.rows[0].setting_value : null;
    }

    /**
   * Increments the production run number in the database.
   * @async
   */
    async function incrementProductionRun() {
      await pool.query(`
      UPDATE bot_settings SET setting_value = setting_value::int + 1 WHERE setting_key = 'production_run';
    `);
    }

    /**
   * Resets all user scores in the leaderboard to zero.
   * @async
   */
    async function resetLeaderboardScores() {
      await pool.query('UPDATE point_scores SET score = 0');
    // If you also want to increment the seasons_played and top_30_finishes here, adjust the query accordingly
    }

    /**
   * Updates the leaderboard in the designated channel.
   * @async
   */
    async function updateLeaderboard() {
      try {
        const leaderboardChannelId = process.env.LEADERBOARD_CHANNEL_ID;
        const leaderboardChannel = await client.channels.fetch(leaderboardChannelId);
        if (!leaderboardChannel) {
          console.log('Leaderboard channel not found.');
          return;
        }

        const currentRun = await getCurrentProductionRun() || 1; // Use 1 as a fallback if the fetch fails
        const res = await pool.query('SELECT user_id, score FROM point_scores WHERE score > 0 ORDER BY score DESC LIMIT 30');

        // Leaderboard 48h reset timer
        const resetRes = await pool.query('SELECT setting_value FROM bot_settings WHERE setting_key = \'leaderboard_reset_time\'');
        const resetTime = resetRes.rows.length > 0 ? parseInt(resetRes.rows[0].setting_value) : null;
        const discordTimestamp = resetTime ? `<t:${Math.floor(resetTime / 1000)}:R>` : 'Not set';
      
        const leaderboardEmbed = new EmbedBuilder()
          .setTitle('🏆 Leaderboard 🏆')
          .setColor('#0099ff')
          .setDescription(`This Leaderboard tracks your Production Game performance. Each 48 hours the leaderboard will reset itself and calculate rewards based on weekly earnings to top 30 people. All prizes will be distributed after April 22nd\n\n**PRODUCTION RUN #${currentRun}** 🏆[Ends in ${discordTimestamp}]\n\nTop players and their scores:`);
      
        const leaderboardLines = await Promise.all(res.rows.map(async (row, index) => {
          const positionEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
          try {
            const user = await client.users.fetch(row.user_id);
            const scoreEmoji = client.emojis.cache.get(process.env.SCORE_EMOJI_ID) || '💰';
            const escapedUsername = escapeMarkdown(user.username);
            return `${positionEmoji} ${index + 1}. ${escapedUsername} - ${row.score} ${scoreEmoji}`;
          } catch (error) {
            console.error(`Failed to fetch user ${row.user_id}:`, error);
            return `${positionEmoji} ${index + 1}. Unknown User (${row.user_id}) - ${row.score}`;
          }
        }));
  
        // Split the leaderboard lines into chunks of 10
        for (let i = 0; i < leaderboardLines.length; i += 10) {
          const chunk = leaderboardLines.slice(i, i + 10).join('\n');
          if (chunk.length > 0) {
            leaderboardEmbed.addFields({ name: '\u200B', value: chunk });
          }
        }
  
        // Fetch the stored message ID and attempt to edit the message
        const storedMessageId = await fetchLeaderboardMessageId();
        let leaderboardMessage;
  
        if (storedMessageId) {
          try {
            leaderboardMessage = await leaderboardChannel.messages.fetch(storedMessageId);
          } catch (error) {
            console.error('Failed to fetch stored leaderboard message:', error);
            leaderboardMessage = null;
          }
        }
  
        if (leaderboardMessage) {
          await leaderboardMessage.edit({ embeds: [leaderboardEmbed] });
        } else {
          const newMessage = await leaderboardChannel.send({ embeds: [leaderboardEmbed] });
          await updateLeaderboardMessageId(newMessage.id);
        }
      } catch (error) {
        console.error('Error updating leaderboard:', error);
      }
    }
  

    /**
   * Returns the appropriate emoji for a given leaderboard position.
   * @param {number|string} rank - The rank position.
   * @returns {string} The corresponding emoji for the rank.
   */
    function getPositionEmoji(rank) {
      const numericRank = Number(rank); // Ensure rank is treated as a numeric value for comparison
      if (numericRank === 1) {
        return '🥇'; // First place emoji
      } else if (numericRank === 2) {
        return '🥈'; // Second place emoji
      } else if (numericRank === 3) {
        return '🥉'; // Third place emoji
      } else {
        return '🔹'; // Default emoji for other ranks
      }
    }

    /**
   * Retrieves statistics for a specific user.
   * @async
   * @param {string} userId - The Discord user ID.
   * @returns {Object} An object containing user statistics.
   */
    async function getUserStats(userId) {
      try {
      // Fetch the entire ranking
        const rankingQuery = `
        SELECT user_id, score, seasons_played, top_30_finishes,
        DENSE_RANK() OVER (ORDER BY score DESC) as rank_position
        FROM point_scores`;
        const rankingRes = await pool.query(rankingQuery);
  
        // Find the specific user's stats within the entire ranking
        const userStats = rankingRes.rows.find(row => row.user_id == userId);
        if (!userStats) {
          return {
            currentRank: 'N/A',
            seasonsPlayed: 0,
            top30Finishes: 0,
            currentScore: 0,
            tokenScore: 0
          };
        }
  
        // Fetch the Token score separately
        const tokenRes = await pool.query('SELECT score FROM token_scores WHERE user_id = $1', [userId]);
        const tokenScore = tokenRes.rowCount > 0 ? tokenRes.rows[0].score : 0;
  
        return {
          currentRank: userStats.rank_position,
          seasonsPlayed: userStats.seasons_played,
          top30Finishes: userStats.top_30_finishes,
          currentScore: userStats.score,
          tokenScore: tokenScore
        };
      } catch (error) {
        console.error('Error fetching user stats:', error);
        return {
          currentRank: 'N/A',
          seasonsPlayed: 0,
          top30Finishes: 0,
          currentScore: 0,
          tokenScore: 0
        };
      }
    }
  
  

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      if (interaction.customId === 'accept_coinflip' && interaction.user.id in global.challengedUsers) {
        const challengerId = global.challengedUsers[interaction.user.id].challengerId;

        // Generate a random result for the coin flip (either 0 or 1)
        const flipResult = Math.floor(Math.random() * 2);

        // Determine the winner based on the result
        const winnerId = flipResult === 0 ? challengerId : interaction.user.id;

        // Update the scores of the users
        const betAmount = global.challengedUsers[interaction.user.id].betAmount;
        const loserId = winnerId === challengerId ? interaction.user.id : challengerId;

        // Update the scores in the database
        await pool.query('UPDATE token_scores SET score = score + $1 WHERE user_id = $2', [betAmount, winnerId]);
        tokenScores[winnerId] += betAmount;

        await pool.query('UPDATE token_scores SET score = score - $1 WHERE user_id = $2', [betAmount, loserId]);
        tokenScores[loserId] -= betAmount;

        // Send a message to the channel with the result and the updated scores
        const resultMessage = flipResult === 0 ? 'Heads' : 'Tails';
        const winner = interaction.client.users.cache.get(winnerId);
        const resultEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setDescription(`${resultMessage}! ${winner} wins ${betAmount} Tokens!`);

        // Show a "Calculating result..." message and remove the buttons
        await interaction.update({ content: 'Calculating result...', components: [] });

        // Delay the result for 3 seconds
        setTimeout(async () => {
          await interaction.editReply({ content: 'Cha ching!', embeds: [resultEmbed] });
        }, 3000);

        // Remove the challenged user from the global.challengedUsers object
        delete global.challengedUsers[interaction.user.id];
        global.challengers = global.challengers.filter(id => id !== challengerId);
      } else if (interaction.customId === 'deny_coinflip' && interaction.user.id in global.challengedUsers) {
        const challengerId = global.challengedUsers[interaction.user.id].challengerId;

        // Code to handle coin flip denial
        await interaction.update({ components: [] });

        // Send a refusal message
        const refusalEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription(`${interaction.user} has refused to participate in a coinflip for ${global.challengedUsers[interaction.user.id].betAmount} Tokens.`);
        interaction.channel.send({ embeds: [refusalEmbed] });

        // Remove the challenged user from the global.challengedUsers object
        delete global.challengedUsers[interaction.user.id];
        global.challengers = global.challengers.filter(id => id !== challengerId);
      } else if (interaction.customId === 'cancel_coinflip' && ((interaction.user.id in global.challengedUsers) || Object.values(global.challengedUsers).some(entry => entry.challengerId === interaction.user.id))) {
        const challengedUserId = interaction.user.id in global.challengedUsers ? interaction.user.id : Object.keys(global.challengedUsers).find(userId => global.challengedUsers[userId].challengerId === interaction.user.id);
        const challengerId = global.challengedUsers[challengedUserId].challengerId;    

        // Code to handle coin flip cancellation
        await interaction.update({ components: [] });

        // Send a cancellation message
        const cancellationEmbed = new EmbedBuilder()
          .setColor('#0099ff')
          .setDescription(`🛑 ${interaction.user} denied ${global.challengedUsers[challengedUserId].betAmount} Tokens coin flip.`);
        interaction.channel.send({ embeds: [cancellationEmbed] });

        // Remove the challenged user from the global.challengedUsers object
        delete global.challengedUsers[challengedUserId];
        global.challengers = global.challengers.filter(id => id !== challengerId);
      } else {
      // If the button is clicked by someone other than the challenged user
        await interaction.reply({ content: 'You are not the challenged user.', ephemeral: true });
      }
    });

    client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('An error occurred during bot initialization:', error);
  }
})();