
import React, { useEffect, useRef } from 'react';
import { PointOfInterest } from '../types';

declare const L: any;

interface MapProps {
    center: { lat: number; lng: number };
    property: { lat: number; lng: number };
    pois: PointOfInterest[];
}

export const MapComponent: React.FC<MapProps> = ({ center, property, pois }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current).setView([center.lat, center.lng], 15);
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Property Marker
            const propertyIcon = L.divIcon({
                html: '<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">🏠</div>',
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            L.marker([property.lat, property.lng], { icon: propertyIcon }).addTo(map)
                .bindPopup('<b>Vaše nemovitost</b>')
                .openPopup();
            
            // POI Markers
            pois.forEach(poi => {
                 const poiIcon = L.divIcon({
                    html: `<div class="w-auto px-2 py-1 bg-white rounded-md shadow-md text-xs font-semibold">${poi.name}</div>`,
                    className: '',
                    iconAnchor: [16, 10]
                });
                L.marker([poi.lat, poi.lng], { icon: poiIcon }).addTo(map)
                    .bindPopup(`<b>${poi.name}</b><br>${poi.type}`);
            });
        }
    }, [center, property, pois]);

    return <div ref={mapContainerRef} style={{ height: '400px', borderRadius: '12px', zIndex: 0 }} />;
};
