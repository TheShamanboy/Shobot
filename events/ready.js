const { Events, REST, Routes } = require('discord.js');
const config = require('../config.json');
require('dotenv').config();

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        
        // Register slash commands
        const commands = [];
        for (const command of client.commands.values()) {
            commands.push(command.data.toJSON());
        }

        const rest = new REST().setToken(process.env.DISCORD_TOKEN || config.token);

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            const data = await rest.put(
                Routes.applicationGuildCommands(client.user.id, config.guildId),
                { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    },
};
