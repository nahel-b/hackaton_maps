import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal, SafeAreaView, Alert } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { convertionLieu, itineraire } from './assets/api';
import polyline from '@mapbox/polyline'; // Import the polyline library

export default function App() {
  const [modalVisible, setModalVisible] = useState(true);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [transportMode, setTransportMode] = useState('walking');
  const [region, setRegion] = useState({
    latitude: 45.1885, // Grenoble center
    longitude: 5.7245,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Convert UI transport mode to API transport mode
  const getApiTransportMode = (uiMode) => {
    const modeMap = {
      'walking': 'WALK',
      'bicycle': 'BICYCLE', 
      'bus': 'TRANSIT',
      'car': 'CAR'
    };
    return modeMap[uiMode] || 'WALK';
  };

  // Parse the route geometry from the API response
  const parseRouteGeometry = (data) => {
    if (!data || !data.plan || !data.plan.itineraries || data.plan.itineraries.length === 0) {
      return [];
    }

    // Get the first itinerary
    const itinerary = data.plan.itineraries[0];
    console.log('Itinéraire:', itinerary);
    
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

  // Search for route
  const searchRoute = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('Erreur', 'Veuillez saisir un point de départ et une destination');
      return;
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

      // Get API transport mode
      const apiTransportMode = getApiTransportMode(transportMode);

      // Get route
      const routeData = await itineraire(startCoords, endCoords, apiTransportMode);
      
      if (routeData) {
        const coordinates = parseRouteGeometry(routeData);
        setRouteCoordinates(coordinates);
        
        // Update map region to fit route
        if (coordinates.length > 0) {
          setRegion({
            ...region,
            latitude: startCoords.lat,
            longitude: startCoords.lon,
          });
        }
        
        // Hide modal to show the route
        setModalVisible(false);
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
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {/* Draw the route if available */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
          />
        )}
      </MapView>
      
      {/* Modal d'itinéraire */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Planifier un itinéraire</Text>
            
            {/* Input départ */}
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={24} color="green" />
              <TextInput
                style={styles.input}
                placeholder="Point de départ"
                value={startLocation}
                onChangeText={setStartLocation}
              />
            </View>
            
            {/* Input arrivée */}
            <View style={styles.inputContainer}>
              <Ionicons name="flag" size={24} color="red" />
              <TextInput
                style={styles.input}
                placeholder="Destination"
                value={endLocation}
                onChangeText={setEndLocation}
              />
            </View>
            
            {/* Choix du mode de transport */}
            <View style={styles.transportContainer}>
              <TouchableOpacity
                style={[styles.transportButton, transportMode === 'walking' && styles.selectedTransport]}
                onPress={() => setTransportMode('walking')}
              >
                <Ionicons name="walk" size={24} color={transportMode === 'walking' ? "white" : "black"} />
                <Text style={transportMode === 'walking' ? styles.selectedTransportText : styles.transportText}>Marche</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.transportButton, transportMode === 'bicycle' && styles.selectedTransport]}
                onPress={() => setTransportMode('bicycle')}
              >
                <Ionicons name="bicycle" size={24} color={transportMode === 'bicycle' ? "white" : "black"} />
                <Text style={transportMode === 'bicycle' ? styles.selectedTransportText : styles.transportText}>Vélo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.transportButton, transportMode === 'car' && styles.selectedTransport]}
                onPress={() => setTransportMode('car')}
              >
                <Ionicons name="car" size={24} color={transportMode === 'car' ? "white" : "black"} />
                <Text style={transportMode === 'car' ? styles.selectedTransportText : styles.transportText}>Voiture</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.transportButton, transportMode === 'bus' && styles.selectedTransport]}
                onPress={() => setTransportMode('bus')}
              >
                <Ionicons name="bus" size={24} color={transportMode === 'bus' ? "white" : "black"} />
                <Text style={transportMode === 'bus' ? styles.selectedTransportText : styles.transportText}>Transport</Text>
              </TouchableOpacity>
            </View>
            
            {/* Bouton de recherche */}
            <TouchableOpacity 
              style={styles.routeButton} 
              onPress={searchRoute}
              disabled={loading}
            >
              <Text style={styles.routeButtonText}>
                {loading ? 'Recherche...' : 'Rechercher'}
              </Text>
            </TouchableOpacity>
            
            {/* Bouton pour réduire le modal */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Ionicons name="chevron-down" size={24} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  map: {
    width: '100%',
    height: '100%',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    height: 40,
  },
  transportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  transportButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    width: '22%',
  },
  selectedTransport: {
    backgroundColor: '#4285F4',
  },
  transportText: {
    fontSize: 12,
    marginTop: 5,
  },
  selectedTransportText: {
    fontSize: 12,
    marginTop: 5,
    color: 'white',
  },
  routeButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    alignItems: 'center',
    padding: 10,
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
