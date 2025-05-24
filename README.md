# Shobot by TSB
 Shobotis a dynamic Discord bot that brings a game-like experience to your server through a custom economy, collectible roles, and interactive features. Users can earn currency by chatting, joining voice calls, claiming dailies, or playing games like blackjack and roulette.
 
## Features

- 🎰 Spin for roles across three categories: Colors, Badges, and Misc, each with unique drop rates

- 🛒 Shop for spins, XP boosts, and other items through an interactive dropdown menu

- 🎒 Manage their inventory, view and equip won roles, or showcase rare badges

- 📊 View a full profile displaying their balance, XP, and collectibles

## Setup Instructions

### 1. Create a Discord Bot

🔹 General
Read Messages/View Channels — to see messages

Send Messages — to reply and send embeds

Use Application Commands — for slash commands

Embed Links — to send embedded messages

Attach Files (optional) — if you ever send images or files

🔹 Interactions
Add Reactions — if you ever use reaction-based input

Use External Emojis — if you plan to use custom emojis

🔹 Role Management (for spinning system)
Manage Roles — to assign roles the user wins

Important: The bot’s highest role must be above the roles it will assign

Also make sure it can’t manage roles it's not supposed to

🔹 Member Permissions (optional but useful)
View Guild Members — to access user info like roles and usernames (needed for inventory/profile display)



### . Set Up the Environment
Fill these information in `env` 

   - `DISCORD_BOT_TOKEN`: Your bot token from the Discord Developer Portal
   - `GUILD_ID`: Your server ID 
   You have to fill the `config` as well

   - `GUILD_ID`: Your server ID 

### . Start the Bot

Run the command to start the bot

```
npm install dotenv
node index.js
```

## Usage

### Commands 

- /economy : To set the shop embed with all buttons 
- /additem : to add items (roles) to the shop and you can set it in any category you want 

### Categories

You decide in which category you want to put that role 
1. Colors 
2. Badges (role with no name just badges)
3. Misc ( anything else an epic role for example)

## Troubleshooting

If you encounter any issues:

1. Check that your bot has all the required permissions
2. Verify that all environment variables are correctly set in the `.env` and the guild ID in `config`.jsonfile
3. Make sure Discord's Developer has the three intents activated.
4. Check if the bot is online and properly connected
5. Review the console logs for any error messages