import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { convertionLieu, itineraire, getAllTransportsImpactCO2 } from './assets/api';
import { getApiTransportMode, parseRouteGeometry, extractTransitPoints, selectAppropriateItinerary } from './utils/routeUtils';
import RouteMap from './components/RouteMap';
import RouteModal from './components/RouteModal';
import RouteInfoModal from './components/RouteInfoModal';
import { getStopCodeByName } from './utils/stopUtils';
import * as Location from 'expo-location';
import { AnimatedImage } from 'expo-image';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function App() {
  // Add state to control welcome screen visibility
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [isInfoModalMinimized, setIsInfoModalMinimized] = useState(false);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [transportMode, setTransportMode] = useState('walking');
  const [wheelchairMode, setWheelchairMode] = useState(false);
  const [region, setRegion] = useState({
    latitude: 45.1885,
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
  const [departureDate, setDepartureDate] = useState(new Date());

  const startApp = () => {
    setShowWelcomeScreen(false);
  };

  const WelcomeScreen = () => {
    return (
      <SafeAreaView style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          <Image 
            source={require('./assets/image/marcus-coucou.gif')} 
            style={styles.marcusImage}
            resizeMode="contain"
            
          />
          
          <Text style={styles.welcomeTitle}>Bonjour, je suis Marcus!</Text>
          
          <Text style={styles.welcomeText}>
            Je suis votre assistant de navigation à Grenoble.
            Je vous aide à trouver le meilleur itinéraire en fonction de vos préférences,
            tout en vous informant sur l'impact environnemental de votre trajet.
          </Text>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={startApp}
          >
            <Text style={styles.startButtonText}>Commencer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

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
  
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walking': return 'walk';
      case 'bicycle': return 'bicycle';
      case 'car': return 'car';
      case 'bus': return 'bus';
      default: return 'navigate';
    }
  };

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

  const minimizeInfoModal = () => {
    setIsInfoModalMinimized(true);
    setInfoModalVisible(false);
  };

  const maximizeInfoModal = () => {
    setIsInfoModalMinimized(false);
    setInfoModalVisible(true);
  };

  const getSelectedItinerary = () => {
    if (!routeData || !routeData.plan || !routeData.plan.itineraries || routeData.plan.itineraries.length === 0) {
      return null;
    }
    
    const apiMode = getApiTransportMode(transportMode, wheelchairMode);
    
    return selectAppropriateItinerary(routeData.plan.itineraries, apiMode);
  };

  const searchRoute = async () => {
    if (!startLocation || !endLocation) {
      
      Alert.alert('Champs requis', 'Veuillez entrer un lieu de départ et une destination');
      setStartLocation(startLocation || 'Ile Verte, Grenoble');
      setEndLocation(endLocation || 'Rue Ampère, Grenoble');
      return;
    }
    setModalVisible(false);
    
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve,1000));


    try {
      let startCoords;
      if (startLocation.toLowerCase() === 'my location' || startLocation.toLowerCase() === 'ma position') {
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

      setStartCoords(startCoords);
      setEndCoords(endCoords);

      const apiTransportMode = getApiTransportMode(transportMode, wheelchairMode);


      const routeData = await itineraire(
        startCoords, 
        endCoords, 
        apiTransportMode, 
        wheelchairMode,
        transportMode === 'walking' ? walkSpeed : null,
        transportMode === 'bicycle' ? bikeSpeed : null,
        safetyModeForWomen,
        departureDate 
      );
      
      if (routeData) {
        setRouteData(routeData);
        
        const coordinates = parseRouteGeometry(routeData, apiTransportMode);
        setRouteCoordinates(coordinates);
        
        const extractedTransitPoints = extractTransitPoints(routeData, apiTransportMode);
        setTransitPoints(extractedTransitPoints);
        
        const allStopTimesData = await fetchAllStopTimes(extractedTransitPoints);
        setStopTimesData(allStopTimesData);
        
        const itinerary = selectAppropriateItinerary(routeData.plan.itineraries, apiTransportMode);
        if (itinerary) {
          const distanceKm = itinerary.walkDistance / 1000; // Conversion m en km
          const impactData = await getAllTransportsImpactCO2(distanceKm);
          setTransportImpactData(impactData);
        }
        
        if (coordinates.length > 0) {
          setRegion({
            ...region,
            latitude: startCoords.lat,
            longitude: startCoords.lon,
          });
        }
        
        setModalVisible(false);
        
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
    
    const transitStops = transitPoints.filter(
      point => point.mode === 'BUS' || point.mode === 'TRAM'
    );
    
    await Promise.all(transitStops.map(async (point, index) => {
      try {
        
        console.log('Fetching stop times for:', point);

        const stopCode = await getStopCodeByName(point.routeId, point.stopName);
        console.log('Stop code:', stopCode);
        if (!stopCode) {
          console.error(`Stop code not found for ${point.stopName}`);
          return;
        }
        
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


  const changeTransportMode = async (newMode) => {
    if (newMode === transportMode) {
      return; 
    }
    
    setTransportMode(newMode);
    setInfoModalVisible(false);
    setIsInfoModalMinimized(true);
    setLoading(true);
    
    try {
      const apiTransportMode = getApiTransportMode(newMode, wheelchairMode);
      
      if (!startCoords || !endCoords) {
        throw new Error("Coordonnées de départ ou d'arrivée manquantes");
      }
      
      const newRouteData = await itineraire(
        startCoords, 
        endCoords, 
        apiTransportMode, 
        wheelchairMode,
        newMode === 'walking' ? walkSpeed : null,
        newMode === 'bicycle' ? bikeSpeed : null,
        safetyModeForWomen
      );
      
      if (newRouteData) {
        setRouteData(newRouteData);
        
        const coordinates = parseRouteGeometry(newRouteData, apiTransportMode);
        setRouteCoordinates(coordinates);
        
        const extractedTransitPoints = extractTransitPoints(newRouteData, apiTransportMode);
        setTransitPoints(extractedTransitPoints);
        
        const allStopTimesData = await fetchAllStopTimes(extractedTransitPoints);
        setStopTimesData(allStopTimesData);
        
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

  const LoadingOverlay = () => {
    const [loadingText, setLoadingText] = useState("Marcus réfléchit");
    const [dots, setDots] = useState("");

    useEffect(() => {
      const interval = setInterval(() => {
        setDots(prevDots => {
          if (prevDots === "...") return "";
          return prevDots + ".";
        });
      }, 500); 

      return () => clearInterval(interval);
    }, []);

    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContainer}>
          <Image 
            source={require('./assets/image/marcus-reflechis.gif')} 
            style={styles.loadingImage}
            resizeMode="contain"
          />
          <View style={styles.loadingTextContainer}>
            <Text style={styles.loadingText}>{loadingText}{dots}</Text>
            {/* <ActivityIndicator 
              size="medium" 
              color="white" 
              style={styles.loadingIndicator} 
            /> */}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
    <View style={styles.container}>
      {showWelcomeScreen ? (
        <WelcomeScreen />
      ) : (
        <>
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
            departureDate={departureDate}
            onDepartureDateChange={setDepartureDate}
          />

          {routeData && (
            <RouteInfoModal
              visible={infoModalVisible}
              routeData={routeData}
              transportMode={transportMode}
              stopTimesData={stopTimesData}
              impactData={transportImpactData}
              onChangeTransportMode={changeTransportMode}
              onClose={() => {}} 
              onReset={resetRoute}
              onMinimize={minimizeInfoModal}
            />
          )}
          
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
          
          {/* Loading overlay APRÈS tout le reste */}
          {loading && 
            <LoadingOverlay />
          }
        </>
      )}
  </View>
  </SafeAreaProvider>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  marcusImage: {
    width: 900,
    height: 600,
    marginBottom: -100,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 15,
    color: '#4285F4',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 40,
    paddingHorizontal: 30,
    lineHeight: 22,
    color: '#888',
  },
  startButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Keep all your existing styles below
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
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 0,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingImage: {
    width: 900,
    height: 400,
    marginBottom: -80,
  },
  loadingTextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    textShadowColor: 'black',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    marginRight: 10,
  },
  loadingIndicator: {
    marginHorizontal: 5,
  },
});
