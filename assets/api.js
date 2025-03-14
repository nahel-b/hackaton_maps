const convertionLieu = async (searchQuery) => {
  console.log("Recherche de :", searchQuery);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery + ", Grenoble, France"
        )}&format=json`
      );
  
      const data = await response.json();
      
      if (data.length > 0) {
       // console.log("Résultat :", data[0]); // Affiche le premier résultat
        
        return data[0]; // Renvoie le premier résultat (latitude & longitude)
      } else {
        console.log("Aucun résultat trouvé.");
        return null;
      }
  } catch (error) {
    console.error("Erreur lors de la requête :", error);
    return null;
  }
};


import jsonData from './routes.json';


const getWayIds = () => {
  // Parse the routes data from the imported JSON
  const parseOverpassData = (data) => {
    return data
      .filter(el => el.type === "way" && el.tags && el.tags.name)
      .map(way => {
        // Remove spaces from route names to match required format
        const routeName = way.tags.name.replace(/\s+/g, '');
        return `Grenoble_${routeName}_${way.id}`;
      });
  };
  const preferredRoutes = parseOverpassData(jsonData);
  return preferredRoutes.join(',');
};

const itineraire = async (from, to, mode = 'WALK', wheelchair = false, walkSpeed = null, bikeSpeed = null, safetyMode = false, departureDate = null) => {
  try {
    const fromCoords = `${from.lat},${from.lon}`;
    const toCoords = `${to.lat},${to.lon}`;
    
    // Construire l'URL de base
    let url = `https://data.mobilites-m.fr/api/routers/default/plan?fromPlace=${fromCoords}&toPlace=${toCoords}&mode=${mode}`;
    
    // Ajouter l'option wheelchair si nécessaire
    if (wheelchair) {
      url += '&wheelchair=true';
    }
    
    // Add walk speed if provided
    if (walkSpeed) {
      url += `&walkSpeed=${walkSpeed/2.25}`;
    }
    
    // Add bike speed if provided
    if (bikeSpeed) {
      url += `&bikeSpeed=${bikeSpeed/2.25}`;
    }
    
    // Add safety mode parameters
    if (safetyMode) {
      url += `&optimize=SAFE`;
    }
    
    // Add date time if provided
    if (departureDate) {
      const isoDate = departureDate.toISOString();
      url += `&date=${isoDate.split('T')[0]}&time=${isoDate.split('T')[1].substring(0, 5)}`;
    }
    
    // Rest of the function remains the same
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'itinéraire:", error);
    return null;
  }
};

const adresseAutocomplete = async (searchQuery) => {
  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery+ ", Grenoble, France")}&limit=4&autocomplete=1`
    );

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.features; // Retourne les suggestions d'adresses
  } catch (error) {
    console.error("Erreur lors de l'autocomplétion d'adresse:", error);
    return [];
  }
};

/**
 * Récupère l'impact CO2 des moyens de transport
 * @param {number} km - Distance en kilomètres
 * @param {string} transportMode - Mode de transport ('walking', 'bicycle', 'car', 'bus')
 * @param {boolean} isElectric - Si le véhicule est électrique (pour voiture/bus)
 * @returns {Promise<Object>} - Les données d'impact CO2
 */
const getImpactCO2 = async (km, transportMode = 'bus', isElectric = false) => {
  try {
    // Conversion du mode de transport de l'UI vers les IDs de l'API
    const transportMap = {
      'walking': '30',
      'bicycle': '7',
      'car': isElectric ? '5' : '4',
      'bus': isElectric ? '16' : '9',
      'tram': '10'
    };
    
    // S'assurer que nous avons un mode valide ou utiliser le tram par défaut
    const transportId = transportMap[transportMode] || '10';
    
    // Construire l'URL avec les paramètres
    const url = `https://impactco2.fr/api/v1/transport?km=${km}&transports=${transportId}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'impact CO2:", error);
    return null;
  }
};

/**
 * Récupère l'impact CO2 de tous les moyens de transport disponibles pour une distance donnée
 * @param {number} km - Distance en kilomètres
 * @returns {Promise<Array>} - Les données d'impact CO2 pour tous les transports
 */
const getAllTransportsImpactCO2 = async (km) => {
  try {
    // Obtenir tous les transports pertinents pour notre application
    const transports = '4,5,7,9,10,16,30'; // IDs pour voiture, vélo, bus, tram, marche
    
    const url = `https://impactco2.fr/api/v1/transport?km=${km}&transports=${transports}&includeConstruction=1`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const responseData = await response.json();
    //console.log("Données d'impact CO2 pour tous les transports:", responseData);
    
    // Retourner directement le tableau data plutôt que l'objet entier
    return responseData.data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération de l'impact CO2:", error);
    return [];  // Renvoyer un tableau vide au lieu de null
  }
};

/**
 * Récupère les données de pollution de l'air pour une localisation donnée
 * @param {number} lat - Latitude de la localisation
 * @param {number} lon - Longitude de la localisation
 * @returns {Promise<Object>} - Les données de pollution de l'air
 */
const getAirPollution = async (lat, lon) => {
  const API_KEY = 'c16349fa5dbbee59d43f8e0e8d19df0f';
  
  try {
    const response = await fetch(
      `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des données de pollution:", error);
    return null;
  }
};

/**
 * Récupère les données météo pour une localisation donnée
 * @param {number} lat - Latitude de la localisation
 * @param {number} lon - Longitude de la localisation
 * @returns {Promise<Object>} - Les données météo
 */
const getWeather = async (lat, lon) => {
  const API_KEY = 'c16349fa5dbbee59d43f8e0e8d19df0f';
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des données météo:", error);
    return null;
  }
};

// Exemple d'utilisation:
// const impact = await getImpactCO2(5, 'bus'); // 5km en bus
// const allImpacts = await getAllTransportsImpactCO2(5); // 5km pour tous les transports

export {convertionLieu, itineraire, adresseAutocomplete, getImpactCO2, getAllTransportsImpactCO2, getAirPollution, getWeather};
