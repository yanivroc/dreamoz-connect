import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { getGoogleMapsConfig } from "@/lib/google-maps.functions";

export interface ParsedAddress {
  address: string;
  city: string;
  postcode: string;
  country: string;
}

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
}

interface PlacePrediction {
  description: string;
  place_id: string;
}

interface GoogleNamespace {
  maps: {
    importLibrary?: (name: string) => Promise<unknown>;
    places?: {
      AutocompleteService?: new () => {
        getPlacePredictions: (
          req: { input: string; types?: string[] },
          cb: (res: PlacePrediction[] | null, status: string) => void,
        ) => void;
      };
      PlacesService?: new (el: HTMLElement) => {
        getDetails: (
          req: { placeId: string; fields: string[] },
          cb: (
            res: { address_components?: { long_name: string; short_name: string; types: string[] }[]; formatted_address?: string } | null,
            status: string,
          ) => void,
        ) => void;
      };
    };
  };
}

let mapsKey: string | null = null;
let loader: Promise<GoogleNamespace | null> | null = null;

async function loadPlaces(): Promise<GoogleNamespace | null> {
  if (loader) return loader;
  loader = (async () => {
    if (mapsKey === null) {
      try {
        const cfg = await getGoogleMapsConfig();
        mapsKey = cfg.browserKey;
      } catch {
        mapsKey = "";
      }
    }
    if (!mapsKey) return null;

    const w = window as unknown as { google?: GoogleNamespace };
    if (!w.google?.maps?.places?.AutocompleteService) {
      const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&libraries=places`;
      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error("maps load failed")));
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("maps load failed"));
        document.head.appendChild(script);
      });
    }
    return (window as unknown as { google?: GoogleNamespace }).google ?? null;
  })().catch((err) => {
    console.error("Google Places unavailable", err);
    return null;
  });
  return loader;
}

function parseComponents(
  components: { long_name: string; short_name: string; types: string[] }[] | undefined,
  fallback: string,
): ParsedAddress {
  const get = (type: string, short = false) => {
    const c = components?.find((x) => x.types.includes(type));
    return c ? (short ? c.short_name : c.long_name) : "";
  };
  const streetNumber = get("street_number");
  const route = get("route");
  const subpremise = get("subpremise");
  const line = [subpremise ? `${subpremise}/` : "", streetNumber, route ? ` ${route}` : ""]
    .join("")
    .trim();
  return {
    address: line || fallback,
    city: get("locality") || get("postal_town") || get("administrative_area_level_2"),
    postcode: get("postal_code"),
    country: get("country"),
  };
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}: Props) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const googleRef = useRef<GoogleNamespace | null>(null);
  const detailsHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadPlaces().then((g) => {
      if (!cancelled) googleRef.current = g;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const query = (input: string) => {
    const places = googleRef.current?.maps?.places;
    if (!places?.AutocompleteService || input.trim().length < 3) {
      setPredictions([]);
      return;
    }
    const service = new places.AutocompleteService();
    service.getPlacePredictions({ input, types: ["address"] }, (res) => {
      setPredictions(res ?? []);
      setOpen((res ?? []).length > 0);
    });
  };

  const choose = (prediction: PlacePrediction) => {
    setOpen(false);
    setPredictions([]);
    const places = googleRef.current?.maps?.places;
    const host = detailsHostRef.current;
    if (!places?.PlacesService || !host) {
      onChange(prediction.description);
      return;
    }
    const service = new places.PlacesService(host);
    service.getDetails(
      { placeId: prediction.place_id, fields: ["address_component", "formatted_address"] },
      (res) => {
        const parsed = parseComponents(res?.address_components, prediction.description);
        onChange(parsed.address);
        onSelect(parsed);
      },
    );
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <Input
        id={id}
        value={value}
        autoComplete="off"
        placeholder={placeholder ?? "Start typing your address"}
        onChange={(e) => {
          onChange(e.target.value);
          query(e.target.value);
        }}
        onFocus={() => setOpen(predictions.length > 0)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      <div ref={detailsHostRef} className="hidden" />
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {predictions.slice(0, 5).map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
