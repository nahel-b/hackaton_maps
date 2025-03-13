import React from 'react';
import { StyleSheet, Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectAppropriateItinerary, hasTransitSegments } from '../utils/routeUtils';

const RouteInfoModal = ({ visible, routeData, onClose, transportMode }) => {
  // Si pas de données d'itinéraire, ne rien afficher
  if (!routeData || !routeData.plan || !routeData.plan.itineraries || routeData.plan.itineraries.length === 0) {
    return null;
  }

  // Récupérer le mode API à partir du mode UI
  const getApiTransportMode = (uiMode) => {
    const modeMap = {
      'walking': 'WALK',
      'bicycle': 'BICYCLE', 
      'bus': 'TRANSIT',
      'car': 'CAR'
    };
    return modeMap[uiMode] || 'WALK';
  };

  const apiMode = getApiTransportMode(transportMode);
  
  // Sélectionner l'itinéraire approprié
  const itinerary = selectAppropriateItinerary(routeData.plan.itineraries, apiMode);
  if (!itinerary) return null;
  
  // Formatage de la durée (de millisecondes à minutes)
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
  
  // Formatage de la distance
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };
  
  // Formatage de l'heure
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Formatage de la date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Icône selon le mode de transport
  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walking': return 'walk';
      case 'bicycle': return 'bicycle';
      case 'car': return 'car';
      case 'bus': return 'bus';
      default: return 'navigate';
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Détails de l'itinéraire</Text>
          
          {/* Résumé du trajet */}
          <View style={styles.summaryContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name={getTransportIcon(transportMode)} size={28} color="#4285F4" />
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.durationText}>{formatDuration(itinerary.duration)}</Text>
              <Text>{formatDistance(itinerary.walkDistance)} • {formatTime(itinerary.startTime)} - {formatTime(itinerary.endTime)}</Text>
            </View>
          </View>

          <ScrollView style={styles.detailsContainer}>
            {/* Informations détaillées */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDate(itinerary.startTime)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Heure départ:</Text>
              <Text style={styles.infoValue}>{formatTime(itinerary.startTime)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Heure arrivée:</Text>
              <Text style={styles.infoValue}>{formatTime(itinerary.endTime)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance:</Text>
              <Text style={styles.infoValue}>{formatDistance(itinerary.walkDistance)}</Text>
            </View>

            {/* Afficher l'élévation pour les modes vélo et marche */}
            {(transportMode === 'walking' || transportMode === 'bicycle') && itinerary.elevationGained && (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Montée:</Text>
                  <Text style={styles.infoValue}>{Math.round(itinerary.elevationGained)} m</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Descente:</Text>
                  <Text style={styles.infoValue}>{Math.round(itinerary.elevationLost)} m</Text>
                </View>
              </>
            )}
            
            {/* Détails des segments de trajet */}
            {itinerary.legs && itinerary.legs.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Étapes:</Text>
                {itinerary.legs.map((leg, index) => (
                  <View key={index} style={styles.legContainer}>
                    <View style={styles.legIconContainer}>
                      <Ionicons 
                        name={leg.mode === 'WALK' ? 'walk' : (leg.mode === 'BICYCLE' ? 'bicycle' : (leg.mode === 'CAR' ? 'car' : 'bus'))} 
                        size={20} 
                        color="#4285F4" 
                      />
                    </View>
                    <View style={styles.legInfo}>
                      <Text style={styles.legMode}>{leg.mode === 'WALK' ? 'Marche' : (leg.mode === 'BICYCLE' ? 'Vélo' : (leg.mode === 'CAR' ? 'Voiture' : 'Transport en commun'))}</Text>
                      <Text>{formatDistance(leg.distance)} • {formatDuration(leg.duration)}</Text>
                      <Text style={styles.legTime}>{formatTime(leg.startTime)} - {formatTime(leg.endTime)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
          
          {/* Bouton pour fermer */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconContainer: {
    padding: 10,
    backgroundColor: '#f0f6ff',
    borderRadius: 50,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
  },
  durationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsContainer: {
    maxHeight: '65%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  legContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legIconContainer: {
    padding: 8,
    backgroundColor: '#f0f6ff',
    borderRadius: 50,
    marginRight: 12,
  },
  legInfo: {
    flex: 1,
  },
  legMode: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  legTime: {
    marginTop: 3,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default RouteInfoModal;