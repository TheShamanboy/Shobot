const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Add a new item to the shop (Admin only)')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Unique ID for the item')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Display name of the item')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('price')
                .setDescription('Price in coins')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of item')
                .setRequired(true)
                .addChoices(
                    { name: 'Spins', value: 'spins' },
                    { name: 'XP', value: 'xp' },
                    { name: 'Currency', value: 'currency' },
                    { name: 'Role - Colors', value: 'role_colors' },
                    { name: 'Role - Badges', value: 'role_badges' },
                    { name: 'Role - Misc', value: 'role_misc' },
                    { name: 'Custom', value: 'custom' }
                ))
        .addIntegerOption(option =>
            option.setName('quantity')
                .setDescription('Amount/quantity of the item')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Description of the item')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Emoji for the item (optional)')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Discord role to give (required for role types)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user has admin permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You need Administrator permissions to use this command!',
                ephemeral: true
            });
            return;
        }

        const id = interaction.options.getString('id');
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const type = interaction.options.getString('type');
        const quantity = interaction.options.getInteger('quantity');
        const description = interaction.options.getString('description');
        const emoji = interaction.options.getString('emoji') || '🎁';
        const role = interaction.options.getRole('role');

        // Validate inputs
        if (price < 1) {
            await interaction.reply({
                content: '❌ Price must be at least 1 coin!',
                ephemeral: true
            });
            return;
        }

        if (quantity < 1) {
            await interaction.reply({
                content: '❌ Quantity must be at least 1!',
                ephemeral: true
            });
            return;
        }

        // Validate role requirement for role types
        if (type.startsWith('role_') && !role) {
            await interaction.reply({
                content: '❌ You must select a Discord role when adding a role type item!',
                ephemeral: true
            });
            return;
        }

        try {
            // Get current shop data
            const shopData = database.getShopData();

            // Check if item ID already exists
            if (shopData.items.find(item => item.id === id)) {
                await interaction.reply({
                    content: `❌ An item with ID '${id}' already exists!`,
                    ephemeral: true
                });
                return;
            }

            // Create new item
            const newItem = {
                id: id,
                name: name,
                price: price,
                type: type,
                quantity: quantity,
                description: description,
                emoji: emoji
            };

            // If it's a role type, add it to the roles data instead of shop
            if (type.startsWith('role_')) {
                const category = type.replace('role_', '');
                const rolesData = database.getRolesData();
                
                if (!rolesData.categories[category]) {
                    await interaction.reply({
                        content: `❌ Invalid role category: ${category}`,
                        ephemeral: true
                    });
                    return;
                }

                const roleItem = {
                    id: id,
                    name: name,
                    roleId: role.id,
                    emoji: emoji
                };

                rolesData.categories[category].roles.push(roleItem);
                
                // Save roles data
                const rolesPath = require('path').join(__dirname, '../data/roles.json');
                fs.writeFileSync(rolesPath, JSON.stringify(rolesData, null, 2));

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Role Added to Spinner!')
                    .setColor('#00ff00')
                    .addFields(
                        { name: 'Role', value: `${emoji} ${role.name}`, inline: true },
                        { name: 'Category', value: category, inline: true },
                        { name: 'ID', value: id, inline: true }
                    )
                    .setDescription(`The role has been added to the ${category} category and will now appear in spins!`)
                    .setTimestamp();

                await interaction.reply({
                    embeds: [successEmbed],
                    ephemeral: true
                });
                return;
            }

            // Add regular item to shop
            shopData.items.push(newItem);

            // Save updated shop data
            const shopPath = require('path').join(__dirname, '../data/shop.json');
            fs.writeFileSync(shopPath, JSON.stringify(shopData, null, 2));

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Item Added Successfully!')
                .setColor('#00ff00')
                .addFields(
                    { name: 'ID', value: id, inline: true },
                    { name: 'Name', value: `${emoji} ${name}`, inline: true },
                    { name: 'Price', value: `${price} coins`, inline: true },
                    { name: 'Type', value: type, inline: true },
                    { name: 'Quantity', value: quantity.toString(), inline: true },
                    { name: 'Description', value: description, inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [successEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error adding item to shop:', error);
            await interaction.reply({
                content: '❌ An error occurred while adding the item to the shop!',
                ephemeral: true
            });
        }
    }
};