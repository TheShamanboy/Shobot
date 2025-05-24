const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
require('dotenv').config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Activity tracking for currency earning
const activeUsers = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const userId = message.author.id;
    const now = Date.now();
    const lastActivity = activeUsers.get(userId) || 0;
    
    // Award currency for activity (once per minute)
    if (now - lastActivity > 60000) {
        const database = require('./utils/database');
        const userData = database.getUser(userId);
        userData.currency += Math.floor(Math.random() * 5) + 1; // 1-5 currency
        database.saveUser(userId, userData);
        activeUsers.set(userId, now);
        
        // Notify for daily claim if available
        if (database.canClaimDaily(userId)) {
            message.author.send('🎉 Your daily reward is ready to claim! Use `/economy` and check your profile.').catch(() => {});
        }
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member?.user.bot) return;
    
    const userId = newState.member.user.id;
    const now = Date.now();
    const lastActivity = activeUsers.get(userId) || 0;
    
    // Award currency for voice activity (once per 2 minutes)
    if (newState.channelId && now - lastActivity > 120000) {
        const database = require('./utils/database');
        const userData = database.getUser(userId);
        userData.currency += Math.floor(Math.random() * 8) + 2; // 2-10 currency
        database.saveUser(userId, userData);
        activeUsers.set(userId, now);
    }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN || config.token);
