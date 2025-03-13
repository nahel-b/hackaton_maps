import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache to store route data
const routeStopsCache = {};
const CACHE_STORAGE_KEY = 'routeStopsCache';

// Function to fetch route stops data
export async function fetchRouteStops(routeId) {
  // Check if we already have this data cached
  if (routeStopsCache[routeId]) {
    return routeStopsCache[routeId];
  }
  console.log('Fetching stops for route:', routeId);
  // If not cached, make the API call
  const url = `https://data.mobilites-m.fr/api/routers/default/index/routes/${routeId}/stops`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch stops for route ${routeId}: ${response.status}`);
    }
    
    const stopsData = await response.json();
    // Cache the data
    routeStopsCache[routeId] = stopsData;
    
    // Save to persistent storage
    await saveRouteCacheToStorage();
    
    return stopsData;
  } catch (error) {
    console.error(`Error fetching stops for route ${routeId}:`, error);
    return null;
  }
}

// Function to get stop code by route ID and stop name
export async function getStopCodeByName(routeId, stopName) {
  const stopsData = await fetchRouteStops(routeId);
  
  if (!stopsData) {
    return null;
  }
  


  // Find the stop with the matching name (case insensitive)
  const stop = stopsData.find(stop => 
    stopName.toLowerCase().includes(stop.name.toLowerCase()));
  
    console.log('Found stop:', stop);
  return stop ? stop.gtfsId : null;
}

// Function to save cache to persistent storage
async function saveRouteCacheToStorage() {
  try {
    await AsyncStorage.setItem(
      CACHE_STORAGE_KEY, 
      JSON.stringify(routeStopsCache)
    );
  } catch (error) {
    console.error('Error saving route cache to storage:', error);
  }
}

// Function to load cache from persistent storage
export async function loadRouteCacheFromStorage() {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
    if (cachedData !== null) {
      Object.assign(routeStopsCache, JSON.parse(cachedData));
      console.log('Route stops cache loaded from storage');
    } else {
      console.log('No route cache found, starting with empty cache');
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
}

// Initialize by loading existing cache
loadRouteCacheFromStorage();