# Discord Leaderboard Bot

This Discord bot is a portfolio project demonstrating various features including user point tracking, leaderboards, and cryptocurrency wallet integration.

## Features

- User point and token tracking
- Leaderboard system
- Cryptocurrency wallet integration
- Admin commands for point management

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database (You can use services like Railway or Render for hosting)
- Discord Bot Token
- Discord Server (for testing)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/YinsPeace/Discord-Leaderboard-Bot.git
   cd discord-bot-portfolio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required values in `.env`

4. Set up the PostgreSQL database:
   - Create a new PostgreSQL database (We recommend using [Render](https://render.com) or [Railway](https://railway.app))
   - Update the `DATABASE_URL` in your `.env` file with the connection string

5. Run the bot:
   ```bash
   node index.js
   ```

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token
- `DATABASE_URL`: PostgreSQL connection string
- `CLIENT_ID`: Your Discord application client ID
- `GUILD_ID`: ID of the Discord server for testing
- `TOKEN_EMOJI_ID`: ID of the custom emoji for tokens
- `LEADERBOARD_CHANNEL_ID`: ID of the channel for posting leaderboards
- `WEEKLY_WINNERS_THREAD_ID`: ID of the thread for posting weekly winners

## Commands

- `/myrank`: View your current rank and points
- `/give`: Give points to a user (Admin only)
- `/remove`: Remove points from a user (Admin only)
- `/set`: Set a new point score for a user (Admin only)
- `/registerwallet`: Register your cryptocurrency wallet
- `/editwallet`: Edit your registered wallet
- `/viewwallet`: View a user's registered wallet & stats (Admin only)
- `/resetgame`: Reset the game and update leaderboards (Admin only)

## Project Structure

- `index.js`: Main entry point of the bot
- `database.js`: Database connection and initialization
- `commands/`: Individual command files

## Contributing

This is a portfolio project and is not open for contributions. However, feel free to fork and modify for your own use!

### How to Contribute

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

## Reporting Issues

If you encounter any issues, please report them by creating a new issue in the [Issues](https://github.com/yourusername/discord-bot-portfolio/issues) section of the repository.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Development

### Linting

This project uses ESLint for code linting. To run the linter:

```
npm run lint
```

### Running Tests

To run the tests:

```
npm test
```

### Setting Up the Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/discord-bot-portfolio.git
   cd discord-bot-portfolio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in the required values in `.env`

4. Set up the PostgreSQL database:
   - Create a new PostgreSQL database (We recommend using [Render](https://render.com) or [Railway](https://railway.app))
   - Update the `DATABASE_URL` in your `.env` file with the connection string

5. Run the bot:
   ```bash
   node index.js
   ```

## Contact

For any questions or inquiries, feel free to reach out!
