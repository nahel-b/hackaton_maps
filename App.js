import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { convertionLieu, itineraire } from './assets/api';
import { getApiTransportMode, parseRouteGeometry, extractTransitPoints, selectAppropriateItinerary } from './utils/routeUtils';
import RouteMap from './components/RouteMap';
import RouteModal from './components/RouteModal';
import RouteInfoModal from './components/RouteInfoModal';
import { getStopCodeByName } from './utils/stopUtils';

export default function App() {
  const [modalVisible, setModalVisible] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [isInfoModalMinimized, setIsInfoModalMinimized] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [transportMode, setTransportMode] = useState('walking');
  const [wheelchairMode, setWheelchairMode] = useState(false);
  const [region, setRegion] = useState({
    latitude: 45.1885, // Grenoble center
    longitude: 5.7245,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [transitPoints, setTransitPoints] = useState([]);
  const [stopTimesData, setStopTimesData] = useState({});

  // Format duration helper function
  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
        return `${hours}h ${remainingMinutes}min`;
    } else {
        return `${minutes} min`;
    }
  };
  
  // Format distance helper function
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Function to get icon for transport mode
  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walking': return 'walk';
      case 'bicycle': return 'bicycle';
      case 'car': return 'car';
      case 'bus': return 'bus';
      default: return 'navigate';
    }
  };

  // Reset the route and return to initial state
  const resetRoute = () => {
    setInfoModalVisible(false);
    setIsInfoModalMinimized(false);
    setModalVisible(true);
    setRouteCoordinates([]);
    setRouteData(null);
    setStartCoords(null);
    setEndCoords(null);
    setTransitPoints([]);
    setStopTimesData({});
  };

  // Minimize the route info modal
  const minimizeInfoModal = () => {
    setIsInfoModalMinimized(true);
    setInfoModalVisible(false);
  };

  // Maximize the route info modal
  const maximizeInfoModal = () => {
    setIsInfoModalMinimized(false);
    setInfoModalVisible(true);
  };

  // Get the selected itinerary for summary
  const getSelectedItinerary = () => {
    if (!routeData || !routeData.plan || !routeData.plan.itineraries || routeData.plan.itineraries.length === 0) {
      return null;
    }
    
    const apiMode = getApiTransportMode(transportMode, wheelchairMode);
    
    // This function is imported from utils/routeUtils.js
    return selectAppropriateItinerary(routeData.plan.itineraries, apiMode);
  };

  // Search for route
  const searchRoute = async () => {
    if (!startLocation || !endLocation) {
      
      
      Alert.alert('Champs requis', 'Veuillez entrer un lieu de départ et une destination');
      setStartLocation(startLocation || 'Ile Verte, Grenoble');
      setEndLocation(endLocation || 'Rue Ampère, Grenoble');
    }

    setLoading(true);
    try {
      // Convert locations to coordinates
      const startCoords = await convertionLieu(startLocation);
      const endCoords = await convertionLieu(endLocation);

      if (!startCoords || !endCoords) {
        Alert.alert('Erreur', 'Impossible de trouver les coordonnées des lieux indiqués');
        setLoading(false);
        return;
      }

      // Save the coordinates
      setStartCoords(startCoords);
      setEndCoords(endCoords);

      // Get API transport mode
      const apiTransportMode = getApiTransportMode(transportMode, wheelchairMode);

      // Get route
      const routeData = await itineraire(startCoords, endCoords, apiTransportMode, wheelchairMode);
      
      if (routeData) {
        // Stocker les données complètes de l'itinéraire
        setRouteData(routeData);
        
        // Passer le mode de transport à parseRouteGeometry
        const coordinates = parseRouteGeometry(routeData, apiTransportMode);
        setRouteCoordinates(coordinates);
        
        // Extract transit points
        const extractedTransitPoints = extractTransitPoints(routeData, apiTransportMode);
        setTransitPoints(extractedTransitPoints);
        
        // Fetch all stop times data
        const allStopTimesData = await fetchAllStopTimes(extractedTransitPoints);
        setStopTimesData(allStopTimesData);
        
        // Update map region to fit route
        if (coordinates.length > 0) {
          setRegion({
            ...region,
            latitude: startCoords.lat,
            longitude: startCoords.lon,
          });
        }
        
        // Hide planning modal to show the route
        setModalVisible(false);
        
        // Show route info modal
        setInfoModalVisible(true);
      } else {
        Alert.alert('Erreur', 'Impossible de calculer l\'itinéraire');
      }
    } catch (error) {
      console.error('Error searching route:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la recherche de l\'itinéraire');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStopTimes = async (transitPoints) => {
    const stopTimesResult = {};
    
    // Process only BUS and TRAM points
    const transitStops = transitPoints.filter(
      point => point.mode === 'BUS' || point.mode === 'TRAM'
    );
    
    // Fetch stop times for all transit stops
    await Promise.all(transitStops.map(async (point, index) => {
      try {
        
        console.log('Fetching stop times for:', point);

        const stopCode = await getStopCodeByName(point.routeId, point.stopName);
        console.log('Stop code:', stopCode);
        if (!stopCode) {
          console.error(`Stop code not found for ${point.stopName}`);
          return;
        }
        
        // Fetch real-time data
        const response = await fetch(`https://data.mobilites-m.fr/api/routers/default/index/stops/${stopCode}/stoptimes`, {
          headers: {
            origin: 'mon_appli'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stop times: ${response.status}`);
        }
        
        const data = await response.json();
        stopTimesResult[index] = data;
      } catch (error) {
        console.error(`Error fetching stop times for ${point.stopName}:`, error);
      }
    }));
    
    return stopTimesResult;
  };

  return (
    <View style={styles.container}>
      {/* Carte en arrière-plan */}
      <RouteMap
        region={region}
        routeCoordinates={routeCoordinates}
        startCoords={startCoords}
        endCoords={endCoords}
        transitPoints={transitPoints}
        stopTimesData={stopTimesData}
        onRegionChangeComplete={setRegion}
      />
      
      {/* Modal de planification d'itinéraire */}
      <RouteModal
        visible={modalVisible}
        startLocation={startLocation}
        endLocation={endLocation}
        transportMode={transportMode}
        wheelchairMode={wheelchairMode}
        loading={loading}
        onClose={() => setModalVisible(false)}
        onSearch={searchRoute}
        onStartLocationChange={setStartLocation}
        onEndLocationChange={setEndLocation}
        onTransportModeChange={setTransportMode}
        onWheelchairModeChange={setWheelchairMode}
      />

      {/* Modal d'informations d'itinéraire */}
      {routeData && (
        <RouteInfoModal
          visible={infoModalVisible}
          routeData={routeData}
          transportMode={transportMode}
          stopTimesData={stopTimesData}
          onClose={() => {}} // No-op since we don't actually close it
          onReset={resetRoute}
          onMinimize={minimizeInfoModal}
        />
      )}
      
      {/* Floating summary button when route info is minimized */}
      {isInfoModalMinimized && routeData && (
        <TouchableOpacity
          style={styles.routeSummaryButton}
          onPress={maximizeInfoModal}
        >
          <View style={styles.summaryIconContainer}>
            <Ionicons name={getTransportIcon(transportMode)} size={24} color="#4285F4" />
          </View>
          <View style={styles.summaryTextContainer}>
            {(() => {
              const itinerary = getSelectedItinerary();
              return itinerary ? (
                <>
                  <Text style={styles.summaryDuration}>
                    {formatDuration(itinerary.duration)}
                  </Text>
                  <Text style={styles.summaryDistance}>
                    {formatDistance(itinerary.walkDistance)}
                  </Text>
                </>
              ) : (
                <Text style={styles.summaryText}>Voir détails</Text>
              );
            })()}
          </View>
          <Ionicons name="chevron-up" size={24} color="#4285F4" />
        </TouchableOpacity>
      )}
      
      {/* Floating button to open route planning modal */}
      {!modalVisible && !routeData && !infoModalVisible && !isInfoModalMinimized && (
        <TouchableOpacity
          style={styles.openModalButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.openModalText}>Planifier un itinéraire</Text>
        </TouchableOpacity>
      )}
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  openModalButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  openModalText: {
    fontWeight: 'bold',
  },
  routeSummaryButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%'
  },
  summaryIconContainer: {
    backgroundColor: '#f0f6ff',
    padding: 8,
    borderRadius: 20,
    marginRight: 10
  },
  summaryTextContainer: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  summaryDuration: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  summaryDistance: {
    color: '#666',
  },
  summaryText: {
    fontWeight: 'bold',
  },
});
