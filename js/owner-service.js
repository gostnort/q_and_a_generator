// Owner Service - Manages owner authentication and permissions
class OwnerService {
    constructor() {
        this.owners = [];
        this.settings = {};
        this.currentOwner = null;
        this.loadOwners();
    }

    // Load owners from JSON file
    async loadOwners() {
        const response = await fetch('/data/owners.json');
        if (!response.ok) {
            this.owners = [];
            this.settings = {};
            return false;
        }
        const data = await response.json();
        this.owners = data.owners || [];
        this.settings = data.settings || {};
        console.log(`Loaded ${this.owners.length} owners from JSON`);
        return true;
    }

    // Check if user is an owner
    isOwner(username) {
        if (!username) return false;
        
        const owner = this.owners.find(o => 
            o.username.toLowerCase() === username.toLowerCase() && 
            o.isActive === true
        );
        
        return !!owner;
    }

    // Get owner details
    getOwner(username) {
        if (!username) return null;
        
        return this.owners.find(o => 
            o.username.toLowerCase() === username.toLowerCase() && 
            o.isActive === true
        );
    }

    // Authenticate owner
    authenticateOwner(username) {
        const owner = this.getOwner(username);
        if (owner) {
            this.currentOwner = owner;
            // Store in session storage
            sessionStorage.setItem('currentOwner', JSON.stringify(owner));
            console.log(`Owner authenticated: ${owner.displayName} (${owner.role})`);
            return owner;
        }
        return null;
    }

    // Get current owner
    getCurrentOwner() {
        if (this.currentOwner) {
            return this.currentOwner;
        }
        
        // Try to get from session storage
        const stored = sessionStorage.getItem('currentOwner');
        if (stored) {
            try {
                this.currentOwner = JSON.parse(stored);
                return this.currentOwner;
            } catch (error) {
                console.error('Error parsing stored owner:', error);
                sessionStorage.removeItem('currentOwner');
            }
        }
        
        return null;
    }

    // Check if current owner has permission
    hasPermission(permission) {
        const owner = this.getCurrentOwner();
        if (!owner) return false;
        
        return owner.permissions.includes(permission);
    }

    // Logout current owner
    logout() {
        this.currentOwner = null;
        sessionStorage.removeItem('currentOwner');
        console.log('Owner logged out');
    }

    // Add new owner (admin only)
    async addOwner(ownerData) {
        if (!this.hasPermission('manage_owners')) {
            throw new Error('Insufficient permissions to add owners');
        }

        // Check if username already exists
        if (this.owners.find(o => o.username.toLowerCase() === ownerData.username.toLowerCase())) {
            throw new Error('Username already exists');
        }

        const newOwner = {
            ...ownerData,
            createdAt: new Date().toISOString(),
            isActive: true
        };

        this.owners.push(newOwner);
        
        // In a real app, you'd save this back to the server
        console.log(`New owner added: ${newOwner.username}`);
        return newOwner;
    }

    // Update owner (admin only)
    async updateOwner(username, updates) {
        if (!this.hasPermission('manage_owners')) {
            throw new Error('Insufficient permissions to update owners');
        }

        const ownerIndex = this.owners.findIndex(o => o.username.toLowerCase() === username.toLowerCase());
        if (ownerIndex === -1) {
            throw new Error('Owner not found');
        }

        this.owners[ownerIndex] = {
            ...this.owners[ownerIndex],
            ...updates,
            lastUpdated: new Date().toISOString()
        };

        console.log(`Owner updated: ${username}`);
        return this.owners[ownerIndex];
    }

    // Deactivate owner (admin only)
    async deactivateOwner(username) {
        if (!this.hasPermission('manage_owners')) {
            throw new Error('Insufficient permissions to deactivate owners');
        }

        const owner = this.getOwner(username);
        if (!owner) {
            throw new Error('Owner not found');
        }

        // Don't allow deactivating yourself
        const currentOwner = this.getCurrentOwner();
        if (currentOwner && currentOwner.username.toLowerCase() === username.toLowerCase()) {
            throw new Error('Cannot deactivate your own account');
        }

        await this.updateOwner(username, { isActive: false });
        console.log(`Owner deactivated: ${username}`);
    }

    // Get all owners (admin only)
    getAllOwners() {
        if (!this.hasPermission('manage_owners')) {
            throw new Error('Insufficient permissions to view all owners');
        }

        return this.owners.map(owner => ({
            ...owner,
            password: undefined // Don't expose passwords
        }));
    }

    // Get owner statistics
    getOwnerStats() {
        const totalOwners = this.owners.length;
        const activeOwners = this.owners.filter(o => o.isActive).length;
        const adminOwners = this.owners.filter(o => o.role === 'admin' && o.isActive).length;
        const teacherOwners = this.owners.filter(o => o.role === 'teacher' && o.isActive).length;

        return {
            total: totalOwners,
            active: activeOwners,
            admins: adminOwners,
            teachers: teacherOwners,
            inactive: totalOwners - activeOwners
        };
    }

    // Validate owner data
    validateOwnerData(ownerData) {
        const errors = [];

        if (!ownerData.username || ownerData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!ownerData.displayName || ownerData.displayName.length < 2) {
            errors.push('Display name must be at least 2 characters long');
        }

        if (!ownerData.email || !this.isValidEmail(ownerData.email)) {
            errors.push('Valid email is required');
        }

        if (!ownerData.role || !['admin', 'teacher'].includes(ownerData.role)) {
            errors.push('Role must be either "admin" or "teacher"');
        }

        return errors;
    }

    // Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Create global instance
window.ownerService = new OwnerService(); 