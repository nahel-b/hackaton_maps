import fs from 'fs/promises';
import path from 'path';

// Cache to store route data
const routeStopsCache = {};
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'routeStopsCache.json');

// Function to fetch route stops data
export async function fetchRouteStops(routeId) {
  // Check if we already have this data cached
  if (routeStopsCache[routeId]) {
    return routeStopsCache[routeId];
  }
  
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
    stop.name.toLowerCase() === stopName.toLowerCase());
  
  return stop ? stop.code : null;
}

// Function to save cache to persistent storage
async function saveRouteCacheToStorage() {
  try {
    // Ensure the data directory exists
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
    await fs.writeFile(
      CACHE_FILE_PATH, 
      JSON.stringify(routeStopsCache, null, 2)
    );
  } catch (error) {
    console.error('Error saving route cache to storage:', error);
  }
}

// Function to load cache from persistent storage
export async function loadRouteCacheFromStorage() {
  try {
    try {
      const cachedData = await fs.readFile(CACHE_FILE_PATH, 'utf8');
      Object.assign(routeStopsCache, JSON.parse(cachedData));
      console.log('Route stops cache loaded from storage');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading route cache from storage:', error);
      } else {
        console.log('No route cache file found, starting with empty cache');
      }
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
}

// Initialize by loading existing cache
loadRouteCacheFromStorage();