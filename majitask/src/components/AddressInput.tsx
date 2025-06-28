import React, { useRef, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, X } from 'lucide-react';
import { TaskLocation } from '../types';

// Declare global google object for TypeScript
declare global {
  interface Window {
    google: typeof google;
  }
}

interface AddressInputProps {
  value?: TaskLocation;
  onChange: (location: TaskLocation | undefined) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = "Enter location...",
  className = "",
  label = "Location"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!inputRef.current) return;

      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        console.warn('Google Places API key not configured. Using manual input only.');
        return;
      }

      try {
        setIsLoading(true);
        
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        });

        await loader.load();

        // Initialize autocomplete
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'formatted_address', 'geometry', 'name'],
        });

        // Add place changed listener
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          
          if (place && place.formatted_address) {
            const location: TaskLocation = {
              address: place.formatted_address,
              placeId: place.place_id,
              coordinates: place.geometry?.location ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              } : undefined,
            };
            
            onChange(location);
          }
        });

        setError(null);
      } catch (err) {
        console.error('Error loading Google Places:', err);
        setError('Google Places unavailable, using manual input');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  const handleClear = () => {
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    if (address.trim()) {
      onChange({
        address: address.trim(),
      });
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={isLoading ? "Loading Google Places..." : placeholder}
          defaultValue={value?.address || ''}
          onChange={handleManualInput}
          disabled={isLoading}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isLoading ? 'bg-gray-50 cursor-wait' : ''
          } ${error ? 'border-red-300' : ''}`}
        />
        
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <span>⚠️ {error}</span>
        </div>
      )}

      {value && value.address && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>{value.address}</span>
          {value.coordinates && (
            <a
              href={`https://www.google.com/maps?q=${value.coordinates.lat},${value.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View on Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
};
