"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { houseIcon } from "@/components/map/LocationMap";

interface Props {
  pin: [number, number] | null;
  view: { center: [number, number]; zoom: number };
  onPin: (lat: number, lng: number) => void;
}

function ClickToPin({ onPin }: { onPin: Props["onPin"] }) {
  useMapEvents({ click: (e) => onPin(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Moves the map when the typed city changes (not on first render, which keeps an existing pin in view).
function Recenter({ view }: { view: Props["view"] }) {
  const map = useMap();
  const first = useRef(true);
  const [lat, lng] = view.center;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.setView([lat, lng], view.zoom);
  }, [map, lat, lng, view.zoom]);
  return null;
}

/** Same OSM tiles as the other maps. Click anywhere to drop the pin; drag the pin to fine-tune it. */
export default function LocationPicker({ pin, view, onPin }: Props) {
  return (
    <MapContainer center={pin ?? view.center} zoom={pin ? 14 : view.zoom} zoomControl={false} className="size-full">
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" maxZoom={19} />
      <ZoomControl position="topright" />
      <ClickToPin onPin={onPin} />
      <Recenter view={view} />
      {pin && (
        <Marker
          position={pin}
          icon={houseIcon}
          draggable
          eventHandlers={{ dragend: (e) => onPin(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
        />
      )}
    </MapContainer>
  );
}
