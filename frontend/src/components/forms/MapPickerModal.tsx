'use client';

import React, { useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPickerModalProps {
  initialLat?: number;
  initialLng?: number;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
}

const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export function MapPickerModal({
  initialLat = 41.0082,
  initialLng = 28.9784,
  onClose,
  onSelect,
}: MapPickerModalProps) {
  const [pin, setPin] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  const handleMapClick = (e: any) => {
    if (e.lngLat) {
      setPin({
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '750px',
          height: '580px',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>
              📍 Haritadan Hassas Konum & Bina Seçimi
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Harita üzerinde iğneyi binanızın tam üstüne tıklayarak sabitleyin (Örn: Gündoğumu Sk. No: 8/1)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Interactive Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Map
            initialViewState={{
              latitude: pin.lat,
              longitude: pin.lng,
              zoom: 16,
            }}
            mapStyle={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? 'mapbox://styles/mapbox/streets-v12' : (OSM_RASTER_STYLE as any)}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            onClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />
            <Marker latitude={pin.lat} longitude={pin.lng}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  transform: 'translateY(-50%)',
                }}
              >
                📍
              </div>
            </Marker>
          </Map>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#1e293b',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
            Seçilen Koordinat: <b>{pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</b>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => onSelect(pin.lat, pin.lng)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ✅ Bu Binayı Sabitle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
