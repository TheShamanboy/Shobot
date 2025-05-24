const database = require('./database');

class Spinner {
    constructor() {
        this.rolesData = database.getRolesData();
    }

    spin() {
        const categories = this.rolesData.categories;
        const totalWeight = Object.values(categories).reduce((sum, cat) => sum + cat.weight, 0);
        const random = Math.random() * totalWeight;
        
        let currentWeight = 0;
        let selectedCategory = null;
        
        // Select category based on weights
        for (const [categoryKey, category] of Object.entries(categories)) {
            currentWeight += category.weight;
            if (random <= currentWeight) {
                selectedCategory = { key: categoryKey, ...category };
                break;
            }
        }
        
        if (!selectedCategory || !selectedCategory.roles.length) {
            // Find a category with roles
            for (const [categoryKey, category] of Object.entries(categories)) {
                if (category.roles.length > 0) {
                    selectedCategory = { key: categoryKey, ...category };
                    break;
                }
            }
            
            // If no categories have roles, return null
            if (!selectedCategory || !selectedCategory.roles.length) {
                return null;
            }
        }
        
        // Select random role from category
        const randomRoleIndex = Math.floor(Math.random() * selectedCategory.roles.length);
        const selectedRole = selectedCategory.roles[randomRoleIndex];
        
        return {
            category: selectedCategory.key,
            categoryName: selectedCategory.name,
            rarity: selectedCategory.rarity,
            role: selectedRole,
            roleId: selectedRole.roleId,
            name: selectedRole.name,
            id: selectedRole.id
        };
    }

    getSpinPreview() {
        const categories = this.rolesData.categories;
        const preview = {};
        
        for (const [key, category] of Object.entries(categories)) {
            preview[key] = {
                name: category.name,
                rarity: category.rarity,
                weight: category.weight,
                count: category.roles.length,
                chance: `${(category.weight * 100).toFixed(2)}%`
            };
        }
        
        return preview;
    }

    getAllRoles() {
        return this.rolesData.categories;
    }
}

module.exports = new Spinner();
