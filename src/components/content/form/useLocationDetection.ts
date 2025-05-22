
import { useState, useEffect } from 'react';
import { FormData } from './types';
import { countries } from './constants';

export const useLocationDetection = (
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
) => {
  const [isDetectingLocation, setIsDetectingLocation] = useState(true);

  useEffect(() => {
    const detectLocation = async () => {
      setIsDetectingLocation(true);
      
      try {
        // Try using IP-based geolocation first - no permission required
        const ipResponse = await fetch('https://ipapi.co/json/');
        
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          const countryCode = ipData.country_code;
          
          // Check if the country is in our list
          if (countryCode && countries.some(country => country.code === countryCode)) {
            setFormData(prev => ({ ...prev, country: countryCode }));
            console.log(`Country detected via IP: ${countryCode}`);
            setIsDetectingLocation(false);
            return;
          }
        }
        
        // Fallback to browser geolocation API if IP-based detection fails
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                );
                
                if (response.ok) {
                  const data = await response.json();
                  const countryCode = data.address?.country_code?.toUpperCase() || '';
                  
                  // Find the country in our list
                  if (countryCode && countries.some(country => country.code === countryCode)) {
                    setFormData(prev => ({ ...prev, country: countryCode }));
                    console.log(`Country detected via browser geolocation: ${countryCode}`);
                  } else {
                    // Default to US if country not in list
                    setFormData(prev => ({ ...prev, country: 'US' }));
                    console.log('Country not found in list, defaulting to US');
                  }
                } else {
                  // Default if geocoding fails
                  setFormData(prev => ({ ...prev, country: 'US' }));
                  console.log('Geocoding failed, defaulting to US');
                }
              } catch (error) {
                console.error('Error with reverse geocoding:', error);
                setFormData(prev => ({ ...prev, country: 'US' }));
                console.log('Error occurred, defaulting to US');
              }
            },
            (error) => {
              console.error('Geolocation permission denied or error:', error);
              setFormData(prev => ({ ...prev, country: 'US' }));
              console.log('Geolocation error, defaulting to US');
            },
            { timeout: 5000, maximumAge: 0 }
          );
        } else {
          // Geolocation not supported
          setFormData(prev => ({ ...prev, country: 'US' }));
          console.log('Geolocation not supported, defaulting to US');
        }
      } catch (error) {
        console.error('Error detecting location:', error);
        setFormData(prev => ({ ...prev, country: 'US' }));
        console.log('Location detection error, defaulting to US');
      } finally {
        setIsDetectingLocation(false);
      }
    };

    // Try to detect location
    detectLocation();
    
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang) {
      setFormData(prev => ({ ...prev, language: browserLang }));
    }
  }, [setFormData]);

  return { isDetectingLocation };
};
