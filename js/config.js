// config.js - Centralized configuration for categories, areas, status values, and placeholders (Updated with Firebase Config)

const Config = {
    // Item Categories
    CATEGORIES: [
        "Electronics",
        "Documents/IDs",
        "Personal Items",
        "Keys",
        "Pets"
    ],

    // Item Status Values
    STATUS_VALUES: {
        LOST: "Lost",
        FOUND: "Found",
        CLAIM_REQUESTED: "Claim Requested",
        VERIFIED: "Verified",
        RETURNED: "Returned",
        ARCHIVED: "Archived"
    },

    // Supported Localities loaded from localStorage to support dynamic Admin updates
    get LOCALITIES() {
        let locs = localStorage.getItem('kochiretrace_localities');
        if (!locs) {
            const defaults = {
                "Marine Drive": { lat: 9.9796, lng: 76.2758 },
                "Lulu Mall, Edappally": { lat: 10.0261, lng: 76.3088 },
                "Vyttila Hub": { lat: 9.9675, lng: 76.3197 },
                "Fort Kochi": { lat: 9.9658, lng: 76.2421 },
                "Kakkanad (Infopark)": { lat: 10.0104, lng: 76.3637 },
                "Kochi Metro Station": { lat: 9.9816, lng: 76.2995 },
                "MG Road": { lat: 9.9712, lng: 76.2816 },
                "Panampilly Nagar": { lat: 9.9621, lng: 76.2922 },
                "Ernakulam Junction (South Station)": { lat: 9.9681, lng: 76.2891 }
            };
            localStorage.setItem('kochiretrace_localities', JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(locs);
    },

    // Default Images / Placeholders
    PLACEHOLDERS: {
        LOST_ITEM: "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=600&q=80", // generic lost keys
        FOUND_ITEM: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80", // box of items
        USER_AVATAR: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
    },

    // Helper: get coordinates for a locality
    getCoordinates(locality) {
        return this.LOCALITIES[locality] || { lat: 9.9816, lng: 76.2995 }; // Default to central Kochi
    },

    // --- FIREBASE PRODUCTION CONFIGURATION ---
    // Paste your Firebase web app config here to connect to the cloud
    FIREBASE: {
        apiKey: "AIzaSyBR8rpjfB-TIJAZ1L_AT5MZibXItR2bw_o",
        authDomain: "kochiretrace.firebaseapp.com",
        projectId: "kochiretrace",
        storageBucket: "kochiretrace.firebasestorage.app",
        messagingSenderId: "64162352290",
        appId: "1:64162352290:web:672c5a3dd1ace63c739bfb"
    }
};

// Export to window
window.Config = Config;
