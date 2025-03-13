import polyline from '@mapbox/polyline';

// Convert UI transport mode to API transport mode
export const getApiTransportMode = (uiMode, wheelchair = false) => {
  // Base modes de transport
  const modeMap = {
    'walking': 'WALK',
    'bicycle': 'BICYCLE', 
    'bus': 'TRANSIT',  // Changé de 'TRAM,RAIL,BUS' à 'TRANSIT' qui est plus standard pour OTP
    'car': 'CAR'
  };
  
  // Obtenir le mode de transport de base
  const mode = modeMap[uiMode] || 'WALK';
  console.log('Mode de transport:', mode);
  
  // Si l'option wheelchair est activée, ajouter le paramètre
//   if (wheelchair) {
//     return `${mode}?wheelchair=true`;
//   }
  
  return mode;
};

// Helper function pour ajouter le paramètre wheelchair à une URL
export const addWheelchairParam = (url, wheelchair = false) => {
  if (wheelchair) {
    // Ajouter le paramètre wheelchair à l'URL
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}wheelchair=true`;
  }
  return url;
};

// Détermine si un itinéraire contient des segments de transport en commun
export const hasTransitSegments = (itinerary) => {
  if (!itinerary.legs) return false;
  
  return itinerary.legs.some(leg => 
    leg.mode === 'BUS' || 
    leg.mode === 'TRAM' || 
    leg.mode === 'RAIL' || 
    leg.mode === 'SUBWAY' ||
    leg.transitLeg === true
  );
};

// Sélectionner l'itinéraire approprié en fonction du mode de transport
export const selectAppropriateItinerary = (itineraries, apiMode) => {
  if (!itineraries || itineraries.length === 0) return null;
  
  // Pour le transport en commun, chercher un itinéraire qui contient effectivement des transports
  if (apiMode === 'TRANSIT') {
    const transitItinerary = itineraries.find(hasTransitSegments);
    if (transitItinerary) {
      console.log('Itinéraire en transport en commun trouvé');
      return transitItinerary;
    }
  }
  
  // Par défaut, retourner le premier itinéraire
  return itineraries[0];
};

// Parse the route geometry from the API response
export const parseRouteGeometry = (data, apiMode = 'WALK') => {
  if (!data || !data.plan || !data.plan.itineraries || data.plan.itineraries.length === 0) {
    return [];
  }

  // Sélectionner l'itinéraire approprié
  const itinerary = selectAppropriateItinerary(data.plan.itineraries, apiMode);
  if (!itinerary) return [];
  
  console.log('Itinéraire sélectionné:', 
    `Mode: ${apiMode}, ` +
    `Distance: ${itinerary.walkDistance}m, ` +
    `Durée: ${Math.round(itinerary.duration/60)}min`
  );
  
  // Collect all coordinates from legs
  let allCoords = [];
  
  itinerary.legs.forEach(leg => {
    if (leg.legGeometry && leg.legGeometry.points) {
      // The points property contains an encoded polyline string
      if (typeof leg.legGeometry.points === 'string') {
        try {
          // Decode the polyline string to get an array of [lat, lng] coordinates
          const decodedPoints = polyline.decode(leg.legGeometry.points);
          
          // Convert the format to {latitude, longitude} objects
          const formattedCoords = decodedPoints.map(point => ({
            latitude: point[0],
            longitude: point[1]
          }));
          
          allCoords = [...allCoords, ...formattedCoords];
        } catch (error) {
          console.error('Failed to decode polyline:', error);
        }
      }
    }
  });

  return allCoords;
};