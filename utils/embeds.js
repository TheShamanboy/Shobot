const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const database = require('./database');
const spinner = require('./spinner');
const config = require('../config.json');

class Embeds {
  createMainEmbed() {
    return new EmbedBuilder()
      .setTitle('🎰 Economy System')
      .setDescription(`Welcome to the economy system! Here you can:

🎮 **Profile** - View your stats and claim daily rewards
🎲 **Spin** - Spin for roles from different categories
🛒 **Shop** - Buy spins, XP boosts, and more
📦 **Inventory** - View and claim your roles

**How to earn currency:**
• Stay active in chat and voice channels
• Claim your daily reward (${config.dailyReward} coins)
• Play mini-games like Blackjack and Roulette
• Win spins and get lucky!

**Role Categories:**
• 🎨 **Colors** - Common roles for customization
• 🏆 **Badges** - Rare achievement roles (0.25% chance)
• ✨ **Misc** - Epic special roles (0.15% chance)`)
      .setColor('#7289da')
      .setImage('https://images.steamusercontent.com/ugc/942824057165995314/3BD7BBED6FBA65BF84598AB1B4010A28C2E5A954/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false') // you can put y our own image URL here
      .setTimestamp();
  }

  createMainButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile')
        .setLabel('Profile')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎮'),
      new ButtonBuilder()
        .setCustomId('spin')
        .setLabel('Spin')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎲'),
      new ButtonBuilder()
        .setCustomId('shop')
        .setLabel('Shop')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛒'),
      new ButtonBuilder()
        .setCustomId('inventory')
        .setLabel('Inventory')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📦')
    );
  }

  createProfileEmbed(userData, canClaimDaily) {
    const level = Math.floor(userData.xp / 100) + 1;
    const xpToNext = 100 - (userData.xp % 100);

    return new EmbedBuilder()
      .setTitle('🎮 Your Profile')
      .setColor('#00ff00')
      .addFields(
        { name: '💰 Currency', value: `${userData.currency} coins`, inline: true },
        { name: '⭐ XP', value: `${userData.xp}`, inline: true },
        { name: '📊 Level', value: `${level}`, inline: true },
        { name: '🎯 XP to Next Level', value: `${xpToNext}`, inline: true },
        { name: '🎲 Extra Spins', value: `${userData.spins || 0}`, inline: true },
        { name: '🎁 Daily Reward', value: canClaimDaily ? '✅ Ready!' : '❌ Claimed', inline: true }
      )
      .setTimestamp();
  }

  createSpinEmbed(userData) {
    const preview = spinner.getSpinPreview();

    let description = '🎲 **Spin for Roles!**\n\n**Categories & Chances:**\n';
    for (const [key, category] of Object.entries(preview)) {
      const emoji = key === 'colors' ? '🎨' : key === 'badges' ? '🏆' : '✨';
      description += `${emoji} **${category.name}** - ${category.chance} (${category.count} roles)\n`;
    }

    description += `\n**Spin Costs:**\n`;
    description += `• 1x Spin: ${config.spinCosts.x1} coins\n`;
    description += `• 2x Spins: ${config.spinCosts.x2} coins\n`;
    description += `• 3x Spins: ${config.spinCosts.x3} coins\n`;
    description += `\n💰 Your Balance: **${userData.currency}** coins`;

    return new EmbedBuilder()
      .setTitle('🎲 Role Spinner')
      .setDescription(description)
      .setColor('#ff6b35')
      .setTimestamp();
  }

  createSpinButtons(userData) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('spin_x1')
        .setLabel(`Spin x1 (${config.spinCosts.x1})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(userData.currency < config.spinCosts.x1),
      new ButtonBuilder()
        .setCustomId('spin_x2')
        .setLabel(`Spin x2 (${config.spinCosts.x2})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(userData.currency < config.spinCosts.x2),
      new ButtonBuilder()
        .setCustomId('spin_x3')
        .setLabel(`Spin x3 (${config.spinCosts.x3})`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(userData.currency < config.spinCosts.x3)
    );
  }

  createSpinResultsEmbed(results, newBalance) {
    const embed = new EmbedBuilder()
      .setTitle('🎉 Spin Results!')
      .setColor('#00ff00')
      .addFields({ name: '💰 New Balance', value: `${newBalance} coins` });

    if (!results || results.length === 0) {
      embed.setDescription('No results to show.');
    } else {
      let description = '';
      results.forEach((result, i) => {
        if (!result || !result.name) return;
        const emoji = result.category === 'colors' ? '🎨' : result.category === 'badges' ? '🏆' : '✨';
        description += `**Spin ${i + 1}:** ${emoji} ${result.name} (${result.categoryName})\n`;
      });
      embed.setDescription(description);
    }
    embed.setTimestamp();

    return embed;
  }

  createShopEmbed(userData) {
    return new EmbedBuilder()
      .setTitle('🛒 Shop')
      .setDescription(`Welcome to the shop! Buy items to enhance your experience.

💰 **Your Balance:** ${userData.currency} coins

Use the dropdown below to purchase items:`)
      .setColor('#9b59b6')
      .setTimestamp();
  }

  createShopMenu() {
    const shopData = database.getShopData();

    const options = shopData.items.map(item => ({
      label: item.name,
      description: `${item.description} - ${item.price} coins`,
      value: item.id,
      emoji: item.emoji || (item.type === 'spins' ? '🎲' : item.type === 'xp' ? '⭐' : '💰'),
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_select')
      .setPlaceholder('Choose an item to purchase...')
      .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
  }

  createInventoryEmbed(userData) {
    const inventory = userData.inventory || {};
    let description = '📦 **Your Inventory**\n\n';

    const categories = {
      colors: { name: 'Colors', emoji: '🎨' },
      badges: { name: 'Badges', emoji: '🏆' },
      misc: { name: 'Miscellaneous', emoji: '✨' },
    };

    for (const [categoryKey, category] of Object.entries(categories)) {
      const items = inventory[categoryKey] || [];
      description += `${category.emoji} **${category.name}** (${items.length} item${items.length !== 1 ? 's' : ''})\n`;

      if (items.length === 0) {
        description += '   *No items in this category*\n';
      } else {
        items.forEach(item => {
          description += `   • ${item.name || 'Unnamed Item'}\n`;
        });
      }
      description += '\n';
    }

    return new EmbedBuilder()
      .setTitle('📦 Inventory')
      .setDescription(description)
      .setColor('#e74c3c')
      .setTimestamp();
  }

  createInventoryButtons(userData) {
    const buttons = [];
    const inventory = userData.inventory || {};

    for (const [category, items] of Object.entries(inventory)) {
      if (items.length > 0) {
        const firstItem = items[0];
        if (firstItem.roleId && firstItem.name) {
          buttons.push(
            new ButtonBuilder()
              .setCustomId(`claim_role_${firstItem.roleId}`)
              .setLabel(`Claim ${firstItem.name}`)
              .setStyle(ButtonStyle.Success)
          );
        }
      }
    }

    if (buttons.length === 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('no_roles')
          .setLabel('No roles to claim')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    }

    return new ActionRowBuilder().addComponents(buttons.slice(0, 5));
  }
}

async function handleSpinButton(userData, spinType) {
  const spinMapping = {
    spin_x1: { count: 1, cost: config.spinCosts.x1 },
    spin_x2: { count: 2, cost: config.spinCosts.x2 },
    spin_x3: { count: 3, cost: config.spinCosts.x3 },
  };

  const spinInfo = spinMapping[spinType];
  if (!spinInfo) {
    return { error: 'Invalid spin type.' };
  }

  if (userData.currency < spinInfo.cost) {
    return { error: `You need ${spinInfo.cost} coins to spin ${spinInfo.count} time(s).` };
  }

  userData.currency -= spinInfo.cost;

  const results = [];
  for (let i = 0; i < spinInfo.count; i++) {
    const spinResult = spinner.spin();

    if (!spinResult || !spinResult.name || !spinResult.category || !spinResult.categoryName) {
      console.warn('Invalid spin result detected, skipping:', spinResult);
      continue;
    }

    results.push(spinResult);

    if (!userData.inventory[spinResult.category]) {
      userData.inventory[spinResult.category] = [];
    }
    userData.inventory[spinResult.category].push(spinResult);
  }

  await database.saveUser(userData.userId, userData);

  return {
    embed: new Embeds().createSpinResultsEmbed(results, userData.currency),
    updatedUserData: userData,
  };
}

async function onButtonInteraction(interaction) {
  const userId = interaction.user.id;
  const userData = database.getUser(userId);

  if (!userData) {
    await interaction.reply({ content: 'User data not found.', ephemeral: true });
    return;
  }

  if (interaction.customId === 'profile') {
    const canClaimDaily = false; 
    const profileEmbed = new Embeds().createProfileEmbed(userData, canClaimDaily);
    await interaction.reply({ embeds: [profileEmbed], ephemeral: true });
  } else if (interaction.customId === 'spin') {
    const spinEmbed = new Embeds().createSpinEmbed(userData);
    const spinButtons = new Embeds().createSpinButtons(userData);
    await interaction.reply({ embeds: [spinEmbed], components: [spinButtons], ephemeral: true });
  } else if (interaction.customId.startsWith('spin_x')) {
    const { embed, error } = await handleSpinButton(userData, interaction.customId);
    if (error) {
      await interaction.reply({ content: error, ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (interaction.customId === 'shop') {
    const shopEmbed = new Embeds().createShopEmbed(userData);
    const shopMenu = new Embeds().createShopMenu();
    await interaction.reply({ embeds: [shopEmbed], components: [shopMenu], ephemeral: true });
  } else if (interaction.customId === 'inventory') {
    const inventoryEmbed = new Embeds().createInventoryEmbed(userData);
    const inventoryButtons = new Embeds().createInventoryButtons(userData);
    await interaction.reply({ embeds: [inventoryEmbed], components: [inventoryButtons], ephemeral: true });
  } else {
    await interaction.reply({ content: 'Unknown interaction.', ephemeral: true });
  }
}

module.exports = {
  Embeds: new Embeds(),
  handleSpinButton,
  onButtonInteraction,
};
