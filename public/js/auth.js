// Authentication state and user profile management
const Auth = {
    currentUser: null,

    // Initialize Auth state
    init: async function() {
        try {
            const response = await fetch('/api/auth/user');
            const data = await response.json();
            if (data.success && data.user) {
                this.currentUser = data.user;
                this.updateUserHeaderUI();
            } else {
                // If on main page and not authenticated, redirect to login
                if (!window.location.pathname.endsWith('login.html')) {
                    window.location.href = '/login.html';
                }
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    },

    // Update Header displaying active user details
    updateUserHeaderUI: function() {
        const userNameEl = document.getElementById('headerUserName');
        const userRoleEl = document.getElementById('headerUserRole');
        
        if (this.currentUser) {
            if (userNameEl) userNameEl.innerText = this.currentUser.name;
            if (userRoleEl) userRoleEl.innerText = `(${this.currentUser.role || 'Manager'})`;
        }
    },

    // Perform User Logout
    logout: async function() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.currentUser = null;
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/login.html';
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();

    const logoutBtn = document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => Auth.logout());
    }
});
