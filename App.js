import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { convertionLieu, itineraire } from './assets/api';
import { getApiTransportMode, parseRouteGeometry } from './utils/routeUtils';
import RouteMap from './components/RouteMap';
import RouteModal from './components/RouteModal';
import RouteInfoModal from './components/RouteInfoModal'; // Importez le nouveau composant

export default function App() {
  const [modalVisible, setModalVisible] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false); // État pour le nouveau modal d'info
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [transportMode, setTransportMode] = useState('walking');
  const [wheelchairMode, setWheelchairMode] = useState(false); // Nouvel état pour l'accessibilité
  const [region, setRegion] = useState({
    latitude: 45.1885, // Grenoble center
    longitude: 5.7245,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeData, setRouteData] = useState(null); // Stocke les données complètes d'itinéraire
  const [loading, setLoading] = useState(false);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);

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

  return (
    <View style={styles.container}>
      {/* Carte en arrière-plan */}
      <RouteMap
        region={region}
        routeCoordinates={routeCoordinates}
        startCoords={startCoords}
        endCoords={endCoords}
        onRegionChangeComplete={setRegion}
      />
      
      {/* Modal de planification d'itinéraire */}
      <RouteModal
        visible={modalVisible}
        startLocation={startLocation}
        endLocation={endLocation}
        transportMode={transportMode}
        wheelchairMode={wheelchairMode} // Nouvelle prop
        loading={loading}
        onClose={() => setModalVisible(false)}
        onSearch={searchRoute}
        onStartLocationChange={setStartLocation}
        onEndLocationChange={setEndLocation}
        onTransportModeChange={setTransportMode}
        onWheelchairModeChange={setWheelchairMode} // Nouveau handler
      />

      {/* Modal d'informations d'itinéraire */}
      <RouteInfoModal
        visible={infoModalVisible}
        routeData={routeData}
        transportMode={transportMode}
        onClose={() => setInfoModalVisible(false)}
      />

      {/* Bouton pour réouvrir le modal s'il est fermé */}
      {!modalVisible && (
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
});
