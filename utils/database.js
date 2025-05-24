const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        this.usersPath = path.join(__dirname, '../data/users.json');
        this.shopPath = path.join(__dirname, '../data/shop.json');
        this.rolesPath = path.join(__dirname, '../data/roles.json');
        
        this.ensureDataFiles();
    }

    ensureDataFiles() {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (!fs.existsSync(this.usersPath)) {
            fs.writeFileSync(this.usersPath, '{}');
        }
        if (!fs.existsSync(this.shopPath)) {
            this.initializeShopData();
        }
        if (!fs.existsSync(this.rolesPath)) {
            this.initializeRolesData();
        }
    }

    initializeShopData() {
        const defaultShop = {
            items: [
                {
                    id: 'spin_1',
                    name: '1 Spin',
                    price: 50,
                    type: 'spins',
                    quantity: 1,
                    description: 'Get 1 additional spin'
                },
                {
                    id: 'spin_5',
                    name: '5 Spins',
                    price: 200,
                    type: 'spins',
                    quantity: 5,
                    description: 'Get 5 additional spins (20% discount!)'
                },
                {
                    id: 'xp_boost',
                    name: 'XP Boost',
                    price: 100,
                    type: 'xp',
                    quantity: 100,
                    description: 'Gain 100 XP instantly'
                },
                {
                    id: 'currency_pack',
                    name: 'Currency Pack',
                    price: 150,
                    type: 'currency',
                    quantity: 200,
                    description: 'Get 200 coins (33% bonus!)'
                }
            ]
        };
        fs.writeFileSync(this.shopPath, JSON.stringify(defaultShop, null, 2));
    }

    initializeRolesData() {
        const defaultRoles = {
            categories: {
                colors: {
                    name: 'Colors',
                    rarity: 'common',
                    weight: 70,
                    roles: [
                        { id: 'red_role', name: 'Red', roleId: 'ROLE_ID_RED' },
                        { id: 'blue_role', name: 'Blue', roleId: 'ROLE_ID_BLUE' },
                        { id: 'green_role', name: 'Green', roleId: 'ROLE_ID_GREEN' },
                        { id: 'purple_role', name: 'Purple', roleId: 'ROLE_ID_PURPLE' },
                        { id: 'yellow_role', name: 'Yellow', roleId: 'ROLE_ID_YELLOW' }
                    ]
                },
                badges: {
                    name: 'Badges',
                    rarity: 'rare',
                    weight: 0.25,
                    roles: [
                        { id: 'vip_badge', name: 'VIP Badge', roleId: 'ROLE_ID_VIP' },
                        { id: 'legend_badge', name: 'Legend Badge', roleId: 'ROLE_ID_LEGEND' },
                        { id: 'champion_badge', name: 'Champion Badge', roleId: 'ROLE_ID_CHAMPION' }
                    ]
                },
                misc: {
                    name: 'Miscellaneous',
                    rarity: 'epic',
                    weight: 0.15,
                    roles: [
                        { id: 'special_user', name: 'Special User', roleId: 'ROLE_ID_SPECIAL' },
                        { id: 'early_supporter', name: 'Early Supporter', roleId: 'ROLE_ID_EARLY' },
                        { id: 'currency_master', name: 'Currency Master', roleId: 'ROLE_ID_CURRENCY' }
                    ]
                }
            }
        };
        fs.writeFileSync(this.rolesPath, JSON.stringify(defaultRoles, null, 2));
    }

    getUsers() {
        try {
            const data = fs.readFileSync(this.usersPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    getUser(userId) {
        const users = this.getUsers();
        if (!users[userId]) {
            users[userId] = {
                userId: userId,
                currency: 100,
                xp: 0,
                spins: 0,
                lastDaily: 0,
                inventory: {
                    colors: [],
                    badges: [],
                    misc: []
                }
            };
            this.saveUsers(users);
        }
        return users[userId];
    }

    saveUser(userId, userData) {
        const users = this.getUsers();
        users[userId] = userData;
        this.saveUsers(users);
    }

    saveUsers(users) {
        fs.writeFileSync(this.usersPath, JSON.stringify(users, null, 2));
    }

    getShopData() {
        try {
            const data = fs.readFileSync(this.shopPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.initializeShopData();
            const data = fs.readFileSync(this.shopPath, 'utf8');
            return JSON.parse(data);
        }
    }

    getRolesData() {
        try {
            const data = fs.readFileSync(this.rolesPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            this.initializeRolesData();
            const data = fs.readFileSync(this.rolesPath, 'utf8');
            return JSON.parse(data);
        }
    }

    canClaimDaily(userId) {
        const userData = this.getUser(userId);
        const now = Date.now();
        const lastDaily = userData.lastDaily || 0;
        const dayInMs = 24 * 60 * 60 * 1000;
        
        return (now - lastDaily) >= dayInMs;
    }
}

module.exports = new Database();
