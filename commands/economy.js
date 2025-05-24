const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../utils/database');
const { Embeds } = require('../utils/embeds');
const spinner = require('../utils/spinner');
const games = require('../utils/games');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Access the economy system'),
    
    async execute(interaction) {
        const mainEmbed = Embeds.createMainEmbed();
        const mainButtons = Embeds.createMainButtons();
        
        await interaction.reply({
            embeds: [mainEmbed],
            components: [mainButtons],
            ephemeral: false
        });
    },

    async handleButtonInteraction(interaction) {
        const userId = interaction.user.id;
        const userData = database.getUser(userId);

        switch (interaction.customId) {
            case 'profile':
                await this.handleProfile(interaction, userData);
                break;
            case 'spin':
                await this.handleSpin(interaction, userData);
                break;
            case 'shop':
                await this.handleShop(interaction, userData);
                break;
            case 'inventory':
                await this.handleInventory(interaction, userData);
                break;
            case 'claim_daily':
                await this.handleDailyReward(interaction, userData);
                break;
            case 'spin_x1':
            case 'spin_x2':
            case 'spin_x3':
                await this.handleSpinAction(interaction, userData);
                break;
            case 'play_blackjack':
                await this.handleBlackjack(interaction, userData);
                break;
            case 'play_roulette':
                await this.handleRoulette(interaction, userData);
                break;
        }

        if (interaction.customId.startsWith('claim_role_')) {
            await this.handleRoleClaim(interaction, userData);
        }

        if (interaction.customId.startsWith('bj_') || interaction.customId.startsWith('roulette_')) {
            await games.handleGameAction(interaction, userData);
        }
    },

    async handleSelectMenuInteraction(interaction) {
        const userId = interaction.user.id;
        const userData = database.getUser(userId);

        if (interaction.customId === 'shop_select') {
            await this.handleShopPurchase(interaction, userData);
        }
    },

    async handleProfile(interaction, userData) {
        const canClaim = database.canClaimDaily(userData.userId);
        const profileEmbed = Embeds.createProfileEmbed(userData, canClaim);
        
        const profileButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_daily')
                    .setLabel(canClaim ? 'Claim Daily Reward' : 'Daily Claimed')
                    .setStyle(canClaim ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(!canClaim),
                new ButtonBuilder()
                    .setCustomId('play_blackjack')
                    .setLabel('Play Blackjack')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('play_roulette')
                    .setLabel('Play Roulette')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [profileEmbed],
            components: [profileButtons],
            ephemeral: true
        });
    },

    async handleSpin(interaction, userData) {
        const spinEmbed = Embeds.createSpinEmbed(userData);
        const spinButtons = Embeds.createSpinButtons(userData);

        await interaction.reply({
            embeds: [spinEmbed],
            components: [spinButtons],
            ephemeral: true
        });
    },

    async handleShop(interaction, userData) {
        const shopEmbed = Embeds.createShopEmbed(userData);
        const shopMenu = Embeds.createShopMenu();

        await interaction.reply({
            embeds: [shopEmbed],
            components: [shopMenu],
            ephemeral: true
        });
    },

    async handleInventory(interaction, userData) {
        const inventoryEmbed = Embeds.createInventoryEmbed(userData);
        const inventoryButtons = Embeds.createInventoryButtons(userData);

        await interaction.reply({
            embeds: [inventoryEmbed],
            components: [inventoryButtons],
            ephemeral: true
        });
    },

    async handleDailyReward(interaction, userData) {
        if (!database.canClaimDaily(userData.userId)) {
            await interaction.reply({
                content: '❌ You have already claimed your daily reward!',
                ephemeral: true
            });
            return;
        }

        userData.currency += config.dailyReward;
        userData.lastDaily = Date.now();
        userData.xp += 25;
        database.saveUser(userData.userId, userData);

        const rewardEmbed = new EmbedBuilder()
            .setTitle('🎉 Daily Reward Claimed!')
            .setDescription(`You received **${config.dailyReward}** coins and **25** XP!`)
            .setColor('#00ff00')
            .addFields(
                { name: 'New Balance', value: `${userData.currency} coins`, inline: true },
                { name: 'XP', value: `${userData.xp}`, inline: true }
            );

        await interaction.reply({
            embeds: [rewardEmbed],
            ephemeral: true
        });
    },

    async handleSpinAction(interaction, userData) {
        const spinType = interaction.customId.split('_')[1];
        const spins = parseInt(spinType.substring(1));
        const cost = config.spinCosts[spinType];

        if (userData.currency < cost) {
            await interaction.reply({
                content: `❌ You need **${cost}** coins to spin ${spins} time(s). You have **${userData.currency}** coins.`,
                ephemeral: true
            });
            return;
        }

        userData.currency -= cost;
        const results = [];

        for (let i = 0; i < spins; i++) {
            const result = spinner.spin();
            
            if (!result) {
                await interaction.reply({
                    content: '❌ No roles available to spin! Ask an admin to add roles using `/additem`.',
                    ephemeral: true
                });
                return;
            }
            
            results.push(result);
            
            if (!userData.inventory[result.category]) {
                userData.inventory[result.category] = [];
            }
            userData.inventory[result.category].push(result);
        }

        database.saveUser(userData.userId, userData);

        const resultsEmbed = Embeds.createSpinResultsEmbed(results, userData.currency);
        
        await interaction.reply({
            embeds: [resultsEmbed],
            ephemeral: true
        });
    },

    async handleShopPurchase(interaction, userData) {
        try {
            const itemId = interaction.values[0];
            const shopData = database.getShopData();
            const item = shopData.items.find(i => i.id === itemId);

            if (!item) {
                await interaction.reply({ content: '❌ Item not found!', ephemeral: true });
                return;
            }

            if (userData.currency < item.price) {
                await interaction.reply({ content: `❌ You need **${item.price}** coins to buy **${item.name}**. You have **${userData.currency}** coins.`, ephemeral: true });
                return;
            }

            userData.currency -= item.price;

            // Handle different item types safely
            switch (item.type) {
                case 'spins':
                    if (typeof userData.spins !== 'number') userData.spins = 0;
                    userData.spins += item.quantity;
                    break;
                case 'xp':
                    userData.xp += item.quantity;
                    break;
                case 'currency':
                    userData.currency += item.quantity;
                    break;
                default:
                    console.warn(`Unknown item type: ${item.type}`);
            }

            database.saveUser(userData.userId, userData);

            const purchaseEmbed = new EmbedBuilder()
                .setTitle('🛒 Purchase Successful!')
                .setDescription(`You bought **${item.name}** for **${item.price}** coins!`)
                .setColor('#00ff00')
                .addFields({ name: 'New Balance', value: `${userData.currency} coins`, inline: true });

            await interaction.reply({ embeds: [purchaseEmbed], ephemeral: true });

        } catch (error) {
            console.error('Error in handleShopPurchase:', error);
            await interaction.reply({ content: '❌ There was an error processing your purchase.', ephemeral: true });
        }
    },

    async handleRoleClaim(interaction, userData) {
        const roleId = interaction.customId.replace('claim_role_', '');
        const guild = interaction.guild;
        const member = interaction.member;

        try {
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                await interaction.reply({
                    content: '❌ Role not found!',
                    ephemeral: true
                });
                return;
            }

            const ownsRole = Object.values(userData.inventory).flat().some(item => item.roleId === roleId);
            
            if (!ownsRole) {
                await interaction.reply({
                    content: '❌ You do not own this role!',
                    ephemeral: true
                });
                return;
            }

            await member.roles.add(role);
            
            await interaction.reply({
                content: `✅ Successfully claimed the **${role.name}** role!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error claiming role:', error);
            await interaction.reply({
                content: '❌ Failed to claim role. Please contact an administrator.',
                ephemeral: true
            });
        }
    },

    async handleBlackjack(interaction, userData) {
        await games.startBlackjack(interaction, userData);
    },

    async handleRoulette(interaction, userData) {
        await games.startRoulette(interaction, userData);
    }
};
