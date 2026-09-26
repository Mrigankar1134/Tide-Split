export type Geo = { lat: number; lng: number; place: string | null };

/** Best-effort device location + short place label. Never throws; resolves null if unavailable. */
export async function captureLocation(timeoutMs = 7000): Promise<Geo | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); resolve(p); },
      () => { clearTimeout(t); resolve(null); },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120000 }
    );
  });
  if (!pos) return null;
  const lat = +pos.coords.latitude.toFixed(5), lng = +pos.coords.longitude.toFixed(5);
  let place: string | null = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(t);
    if (r.ok) {
      const a = (await r.json()).address ?? {};
      const parts = [a.amenity ?? a.shop ?? a.building, a.neighbourhood ?? a.suburb ?? a.village ?? a.town, a.city ?? a.state_district ?? a.state].filter(Boolean);
      place = Array.from(new Set(parts)).slice(0, 3).join(", ") || null;
    }
  } catch { /* offline or blocked: keep coordinates only */ }
  return { lat, lng, place };
}

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
