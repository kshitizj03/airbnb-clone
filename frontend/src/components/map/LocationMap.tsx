"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, ZoomControl } from "react-leaflet";

// Black circle with a white house. Static markup, no user text goes in.
export const houseIcon = L.divIcon({
  className: "",
  iconSize: [0, 0],
  html: `<div class="house-pin"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg></div>`,
});

/** Same OpenStreetMap tiles as the results map (washed out in globals.css). The pin is the listing's coordinates. */
export function LocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={14} zoomControl={false} scrollWheelZoom={false} className="size-full">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
      <ZoomControl position="topright" />
      <Marker position={[latitude, longitude]} icon={houseIcon} keyboard={false} />
    </MapContainer>
  );
}
