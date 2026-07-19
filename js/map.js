// map.js - Leaflet.js mapping logic centered on Ernakulam/Kochi

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Storage || typeof L === 'undefined') {
        console.error("Storage module or Leaflet.js library not loaded!");
        return;
    }

    // 1. Initialize Map
    // Coordinates: Center of Kochi/Ernakulam (Kaloor area)
    const map = L.map('map-container').setView([9.9880, 76.2995], 12);

    // 2. Add OpenStreetMap Tile Layer
    // Supports dark mode mapping if dark theme is active
    const isDark = document.documentElement.classList.contains('dark');
    const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        
    L.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '© OpenStreetMap | KochiRetrace Map'
    }).addTo(map);

    // 3. Custom divIcon templates styled with Tailwind CSS and Material Symbols
    const createMarkerIcon = (status) => {
        let bgColor = 'bg-primary';
        let iconName = 'help';
        let pulseClass = '';

        if (status === 'Lost') {
            bgColor = 'bg-error';
            iconName = 'fmd_bad';
            pulseClass = 'animate-pulse';
        } else if (status === 'Found') {
            bgColor = 'bg-secondary';
            iconName = 'check_circle';
        } else if (status === 'Claim Requested') {
            bgColor = 'bg-amber-500';
            iconName = 'info';
        } else if (status === 'Verified' || status === 'Returned') {
            bgColor = 'bg-slate-400';
            iconName = 'verified';
        }

        return L.divIcon({
            className: 'custom-map-marker',
            html: `
                <div class="relative w-8 h-8 rounded-full ${bgColor} border-2 border-white flex items-center justify-center text-white shadow-xl ${pulseClass}">
                    <span class="material-symbols-outlined text-[15px] font-bold" style="font-variation-settings: 'FILL' 1;">${iconName}</span>
                    <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 ${bgColor} rotate-45 border-r border-b border-white z-[-1]"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32], // Point of the icon should correspond to marker's location
            popupAnchor: [0, -32]  // Popup should open slightly above the marker
        });
    };

    // 4. Plot items
    const items = window.Storage.getItems();

    items.forEach(item => {
        // Skip archived or returned items if desired, but plotting them as closed (gray) is helpful!
        if (item.coords && item.coords.lat && item.coords.lng) {
            
            const marker = L.marker([item.coords.lat, item.coords.lng], {
                icon: createMarkerIcon(item.status)
            }).addTo(map);

            // Construct popup content with styling
            const popupContent = `
                <div class="w-56 p-1 space-y-3 font-body-md text-slate-800 dark:text-slate-200">
                    <div class="relative h-28 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border">
                        <img class="w-full h-full object-cover" src="${item.image}" alt="${item.name}">
                        <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-sm border ${
                            item.status === 'Lost' ? 'bg-error' : item.status === 'Found' ? 'bg-secondary' : 'bg-amber-500'
                        }">
                            ${item.status}
                        </span>
                    </div>
                    <div class="space-y-1">
                        <h4 class="font-extrabold text-sm text-slate-950 truncate">${item.name}</h4>
                        <p class="text-[11px] text-slate-500 flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">location_on</span> ${item.locality}
                        </p>
                        <p class="text-[10px] text-slate-400">Date: ${item.date}</p>
                    </div>
                    <a href="browse.html?itemId=${item.id}" class="block w-full py-2 bg-primary text-white text-center rounded-lg text-xs font-bold hover:opacity-95 shadow-sm active:scale-95 transition-all">
                        View Details & Claim
                    </a>
                </div>
            `;

            marker.bindPopup(popupContent, {
                maxWidth: 240,
                className: 'kochi-custom-popup'
            });
        }
    });

    // Fit map bounds slightly if there are many markers
    // For this prototype, a default view on center of Ernakulam is clean.
});
