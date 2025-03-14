import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { convertionLieu, itineraire, getAllTransportsImpactCO2 } from './assets/api';
import { getApiTransportMode, parseRouteGeometry, extractTransitPoints, selectAppropriateItinerary } from './utils/routeUtils';
import RouteMap from './components/RouteMap';
import RouteModal from './components/RouteModal';
import RouteInfoModal from './components/RouteInfoModal';
import { getStopCodeByName } from './utils/stopUtils';
import * as Location from 'expo-location';

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
  const [walkSpeed, setWalkSpeed] = useState(3);
  const [bikeSpeed, setBikeSpeed] = useState(11);
  const [safetyModeForWomen, setSafetyModeForWomen] = useState(false);
  const [transportImpactData, setTransportImpactData] = useState(null);

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
      return;
    }

    setLoading(true);
    try {
      // Convert locations to coordinates
      let startCoords;
      if (startLocation.toLowerCase() === 'my location' || startLocation.toLowerCase() === 'ma position') {
        // Get user's current location
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow location access to use your current position');
        setLoading(false);
        return;
          }
          
          const location = await Location.getCurrentPositionAsync({});
          startCoords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude
          };
        } catch (error) {
          console.error('Error getting location:', error);
          Alert.alert('Error', 'Unable to get your current location');
          setLoading(false);
          return;
        }
      } else {
        startCoords = await convertionLieu(startLocation);
      }
      
      let endCoords;
      if (endLocation.toLowerCase() === 'my location' || endLocation.toLowerCase() === 'ma position') {
        // Get user's current location for end coordinates
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow location access to use your current position');
        setLoading(false);
        return;
          }
          
          const location = await Location.getCurrentPositionAsync({});
          endCoords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude
          };
        } catch (error) {
          console.error('Error getting location:', error);
          Alert.alert('Error', 'Unable to get your current location');
          setLoading(false);
          return;
        }
      } else {
        endCoords = await convertionLieu(endLocation);
      }

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
      const routeData = await itineraire(
        startCoords, 
        endCoords, 
        apiTransportMode, 
        wheelchairMode,
        transportMode === 'walking' ? walkSpeed : null,
        transportMode === 'bicycle' ? bikeSpeed : null
      );
      
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
        
        // Récupérer l'impact CO2 pour tous les modes de transport
        // Calculer la distance en km
        const itinerary = selectAppropriateItinerary(routeData.plan.itineraries, apiTransportMode);
        if (itinerary) {
          const distanceKm = itinerary.walkDistance / 1000; // Conversion m en km
          const impactData = await getAllTransportsImpactCO2(distanceKm);
          setTransportImpactData(impactData);
        }
        
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

  const handleWalkSpeedChange = (value) => {
    setWalkSpeed(value);
  };

  const handleBikeSpeedChange = (value) => {
    setBikeSpeed(value);
  };

  // Fonction pour changer le mode de transport et recalculer l'itinéraire
  const changeTransportMode = async (newMode) => {
    if (newMode === transportMode) {
      return; // Éviter de recalculer si c'est déjà le mode actuel
    }
    
    setTransportMode(newMode);
    setInfoModalVisible(false);
    setIsInfoModalMinimized(true);
    setLoading(true);
    
    try {
      // Récupérer l'itinéraire avec le nouveau mode de transport
      const apiTransportMode = getApiTransportMode(newMode, wheelchairMode);
      
      // Vérifier que nous avons des coordonnées valides
      if (!startCoords || !endCoords) {
        throw new Error("Coordonnées de départ ou d'arrivée manquantes");
      }
      
      const newRouteData = await itineraire(
        startCoords, 
        endCoords, 
        apiTransportMode, 
        wheelchairMode,
        newMode === 'walking' ? walkSpeed : null,
        newMode === 'bicycle' ? bikeSpeed : null
      );
      
      if (newRouteData) {
        // Mettre à jour les données de l'itinéraire
        setRouteData(newRouteData);
        
        // Mettre à jour les coordonnées de l'itinéraire
        const coordinates = parseRouteGeometry(newRouteData, apiTransportMode);
        setRouteCoordinates(coordinates);
        
        // Mettre à jour les points de transit
        const extractedTransitPoints = extractTransitPoints(newRouteData, apiTransportMode);
        setTransitPoints(extractedTransitPoints);
        
        // Mettre à jour les horaires des arrêts
        const allStopTimesData = await fetchAllStopTimes(extractedTransitPoints);
        setStopTimesData(allStopTimesData);
        
        // Afficher le nouveau modal d'informations
        setInfoModalVisible(true);
        setIsInfoModalMinimized(false);
      } else {
        Alert.alert('Erreur', 'Impossible de calculer le nouvel itinéraire');
      }
    } catch (error) {
      console.error('Error changing transport mode:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du changement de mode de transport');
    } finally {
      setLoading(false);
    }
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
        walkSpeed={walkSpeed}
        bikeSpeed={bikeSpeed}
        loading={loading}
        onClose={() => setModalVisible(false)}
        onSearch={searchRoute}
        onStartLocationChange={setStartLocation}
        onEndLocationChange={setEndLocation}
        onTransportModeChange={setTransportMode}
        onWheelchairModeChange={setWheelchairMode}
        onWalkSpeedChange={handleWalkSpeedChange}
        onBikeSpeedChange={handleBikeSpeedChange}
        safetyModeForWomen={safetyModeForWomen}
        onSafetyModeChange={setSafetyModeForWomen}
      />

      {/* Modal d'informations d'itinéraire */}
      {routeData && (
        <RouteInfoModal
          visible={infoModalVisible}
          routeData={routeData}
          transportMode={transportMode}
          stopTimesData={stopTimesData}
          impactData={transportImpactData}
          onChangeTransportMode={changeTransportMode}
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
