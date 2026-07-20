// config.example.js
// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Copy this file and rename the copy to:  js/config.js
// 2. Replace every placeholder value (marked <<<...>>>) with your real
//    Firebase project values from:
//    https://console.firebase.google.com → Project Settings → Your apps
// 3. NEVER commit js/config.js to version control.
//    The .gitignore in this repo already excludes it.
//
// NOTE: Firebase Web API keys are NOT secret. They are safe to include in
// client-side code.  Real security is enforced by Firestore Security Rules
// and Firebase Authentication, not by hiding the API key.
// ─────────────────────────────────────────────────────────────────────────────

const Config = {
    // ── Item Categories ───────────────────────────────────────────────────────
    CATEGORIES: [
        "Electronics",
        "Documents/IDs",
        "Personal Items",
        "Keys",
        "Pets"
    ],

    // ── Item Status Values ────────────────────────────────────────────────────
    STATUS_VALUES: {
        LOST:            "Lost",
        FOUND:           "Found",
        CLAIM_REQUESTED: "Claim Requested",
        VERIFIED:        "Verified",
        RETURNED:        "Returned",
        ARCHIVED:        "Archived"
    },

    // ── Localities (loaded from localStorage so Admins can update them) ───────
    get LOCALITIES() {
        let locs = localStorage.getItem('kochiretrace_localities');
        if (!locs) {
            const defaults = {
                "Marine Drive":                      { lat: 9.9796,  lng: 76.2758 },
                "Lulu Mall, Edappally":              { lat: 10.0261, lng: 76.3088 },
                "Vyttila Hub":                       { lat: 9.9675,  lng: 76.3197 },
                "Fort Kochi":                        { lat: 9.9658,  lng: 76.2421 },
                "Kakkanad (Infopark)":               { lat: 10.0104, lng: 76.3637 },
                "Kochi Metro Station":               { lat: 9.9816,  lng: 76.2995 },
                "MG Road":                           { lat: 9.9712,  lng: 76.2816 },
                "Panampilly Nagar":                  { lat: 9.9621,  lng: 76.2922 },
                "Ernakulam Junction (South Station)":{ lat: 9.9681,  lng: 76.2891 }
            };
            localStorage.setItem('kochiretrace_localities', JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(locs);
    },

    // ── Placeholder images ────────────────────────────────────────────────────
    PLACEHOLDERS: {
        LOST_ITEM:   "https://images.unsplash.com/photo-1595079676339-1534801ad6cf?auto=format&fit=crop&w=600&q=80",
        FOUND_ITEM:  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
        USER_AVATAR: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
    },

    // ── Coordinate lookup ─────────────────────────────────────────────────────
    getCoordinates(locality) {
        return this.LOCALITIES[locality] || { lat: 9.9816, lng: 76.2995 };
    },

    // ── Firebase Configuration ─────────────────────────────────────────────────
    // Replace all <<<...>>> placeholders with your actual Firebase project values.
    FIREBASE: {
        apiKey:            "<<<YOUR_API_KEY>>>",
        authDomain:        "<<<YOUR_PROJECT_ID>>>.firebaseapp.com",
        projectId:         "<<<YOUR_PROJECT_ID>>>",
        storageBucket:     "<<<YOUR_PROJECT_ID>>>.firebasestorage.app",
        messagingSenderId: "<<<YOUR_MESSAGING_SENDER_ID>>>",
        appId:             "<<<YOUR_APP_ID>>>"
    }
};

window.Config = Config;
