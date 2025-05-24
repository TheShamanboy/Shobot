const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('./database');
const config = require('../config.json');

class Games {
    constructor() {
        this.activeGames = new Map();
    }

    async startBlackjack(interaction, userData) {
        const gameId = `${interaction.user.id}_bj_${Date.now()}`;
        
        const deck = this.createDeck();
        this.shuffleDeck(deck);
        
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        
        const game = {
            id: gameId,
            type: 'blackjack',
            deck: deck,
            playerHand: playerHand,
            dealerHand: dealerHand,
            bet: 25,
            userId: interaction.user.id
        };
        
        if (userData.currency < game.bet) {
            await interaction.reply({
                content: `❌ You need at least **${game.bet}** coins to play Blackjack!`,
                ephemeral: true
            });
            return;
        }
        
        this.activeGames.set(gameId, game);
        
        const embed = this.createBlackjackEmbed(game);
        const buttons = this.createBlackjackButtons(gameId);
        
        await interaction.reply({
            embeds: [embed],
            components: [buttons],
            ephemeral: true
        });
    }

    async startRoulette(interaction, userData) {
        const rouletteEmbed = new EmbedBuilder()
            .setTitle('🎰 Roulette')
            .setDescription('Choose your bet and amount!')
            .setColor('#ff6b35')
            .addFields(
                { name: 'Red/Black', value: '2x payout', inline: true },
                { name: 'Odd/Even', value: '2x payout', inline: true },
                { name: 'Single Number', value: '36x payout', inline: true }
            );

        const rouletteButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('roulette_red_25')
                    .setLabel('Red (25)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('roulette_black_25')
                    .setLabel('Black (25)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('roulette_odd_25')
                    .setLabel('Odd (25)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('roulette_even_25')
                    .setLabel('Even (25)')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [rouletteEmbed],
            components: [rouletteButtons],
            ephemeral: true
        });
    }

    async handleGameAction(interaction, userData) {
        const [gameType, action, ...params] = interaction.customId.split('_');
        
        if (gameType === 'bj') {
            await this.handleBlackjackAction(interaction, action, params.join('_'));
        } else if (gameType === 'roulette') {
            await this.handleRouletteAction(interaction, action, params);
        }
    }

    async handleBlackjackAction(interaction, action, gameId) {
        const game = this.activeGames.get(gameId);
        
        if (!game || game.userId !== interaction.user.id) {
            await interaction.reply({
                content: '❌ Game not found or not your game!',
                ephemeral: true
            });
            return;
        }

        const userData = database.getUser(interaction.user.id);
        
        if (action === 'hit') {
            game.playerHand.push(game.deck.pop());
            
            const playerValue = this.getHandValue(game.playerHand);
            
            if (playerValue > 21) {
                // Player busts
                userData.currency -= game.bet;
                database.saveUser(userData.userId, userData);
                this.activeGames.delete(gameId);
                
                const embed = this.createBlackjackEmbed(game, 'Player Busts! You lose!', '#ff0000');
                await interaction.update({ embeds: [embed], components: [] });
                return;
            }
            
            const embed = this.createBlackjackEmbed(game);
            const buttons = this.createBlackjackButtons(gameId);
            
            await interaction.update({ embeds: [embed], components: [buttons] });
            
        } else if (action === 'stand') {
            // Dealer plays
            let dealerValue = this.getHandValue(game.dealerHand);
            
            while (dealerValue < 17) {
                game.dealerHand.push(game.deck.pop());
                dealerValue = this.getHandValue(game.dealerHand);
            }
            
            const playerValue = this.getHandValue(game.playerHand);
            let result = '';
            let color = '#ffff00';
            
            if (dealerValue > 21) {
                // Dealer busts, player wins
                const winAmount = playerValue === 21 && game.playerHand.length === 2 ? 
                    config.gameRewards.blackjack.blackjack : config.gameRewards.blackjack.win;
                userData.currency += winAmount;
                result = `Dealer Busts! You win ${winAmount} coins!`;
                color = '#00ff00';
            } else if (playerValue > dealerValue) {
                // Player wins
                const winAmount = playerValue === 21 && game.playerHand.length === 2 ? 
                    config.gameRewards.blackjack.blackjack : config.gameRewards.blackjack.win;
                userData.currency += winAmount;
                result = `You win ${winAmount} coins!`;
                color = '#00ff00';
            } else if (playerValue < dealerValue) {
                // Player loses
                userData.currency -= game.bet;
                result = `You lose ${game.bet} coins!`;
                color = '#ff0000';
            } else {
                // Tie
                result = 'It\'s a tie!';
                color = '#ffff00';
            }
            
            database.saveUser(userData.userId, userData);
            this.activeGames.delete(gameId);
            
            const embed = this.createBlackjackEmbed(game, result, color, true);
            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    async handleRouletteAction(interaction, betType, params) {
        const betAmount = parseInt(params[0]);
        const userData = database.getUser(interaction.user.id);
        
        if (userData.currency < betAmount) {
            await interaction.reply({
                content: `❌ You need **${betAmount}** coins to place this bet!`,
                ephemeral: true
            });
            return;
        }
        
        const winningNumber = Math.floor(Math.random() * 37); // 0-36
        const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(winningNumber);
        const isEven = winningNumber > 0 && winningNumber % 2 === 0;
        const isOdd = winningNumber > 0 && winningNumber % 2 === 1;
        
        let won = false;
        let payout = 0;
        
        switch (betType) {
            case 'red':
                won = isRed;
                payout = betAmount * config.gameRewards.roulette.multiplier;
                break;
            case 'black':
                won = !isRed && winningNumber > 0;
                payout = betAmount * config.gameRewards.roulette.multiplier;
                break;
            case 'odd':
                won = isOdd;
                payout = betAmount * config.gameRewards.roulette.multiplier;
                break;
            case 'even':
                won = isEven;
                payout = betAmount * config.gameRewards.roulette.multiplier;
                break;
        }
        
        if (won) {
            userData.currency += payout;
        } else {
            userData.currency -= betAmount;
        }
        
        database.saveUser(userData.userId, userData);
        
        const color = winningNumber === 0 ? 'Green' : (isRed ? 'Red' : 'Black');
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎰 Roulette Result')
            .setDescription(`The ball landed on **${winningNumber}** (${color})`)
            .setColor(won ? '#00ff00' : '#ff0000')
            .addFields(
                { name: 'Your Bet', value: `${betType} - ${betAmount} coins`, inline: true },
                { name: 'Result', value: won ? `Won ${payout} coins!` : `Lost ${betAmount} coins`, inline: true },
                { name: 'New Balance', value: `${userData.currency} coins`, inline: true }
            );
        
        await interaction.update({
            embeds: [resultEmbed],
            components: []
        });
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank });
            }
        }
        
        return deck;
    }

    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else if (['J', 'Q', 'K'].includes(card.rank)) {
                value += 10;
            } else {
                value += parseInt(card.rank);
            }
        }
        
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    getHandString(hand) {
        return hand.map(card => `${card.rank}${card.suit}`).join(' ');
    }

    createBlackjackEmbed(game, result = '', color = '#0099ff', showDealer = false) {
        const playerValue = this.getHandValue(game.playerHand);
        const dealerValue = this.getHandValue(game.dealerHand);
        
        const embed = new EmbedBuilder()
            .setTitle('🃏 Blackjack')
            .setColor(color)
            .addFields(
                { 
                    name: `Your Hand (${playerValue})`, 
                    value: this.getHandString(game.playerHand), 
                    inline: false 
                },
                { 
                    name: `Dealer's Hand ${showDealer ? `(${dealerValue})` : ''}`, 
                    value: showDealer ? 
                        this.getHandString(game.dealerHand) : 
                        `${game.dealerHand[0].rank}${game.dealerHand[0].suit} ?`, 
                    inline: false 
                }
            );
        
        if (result) {
            embed.setDescription(result);
        }
        
        return embed;
    }

    createBlackjackButtons(gameId) {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`bj_hit_${gameId}`)
                    .setLabel('Hit')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`bj_stand_${gameId}`)
                    .setLabel('Stand')
                    .setStyle(ButtonStyle.Secondary)
            );
    }
}

module.exports = new Games();
