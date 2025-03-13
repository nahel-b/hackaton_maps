import React from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Switch } from 'react-native'; // Ajoutez l'import du Switch

const RouteModal = ({ 
  visible, 
  startLocation, 
  endLocation, 
  transportMode, 
  wheelchairMode, // Nouvelle prop
  loading,
  onClose, 
  onSearch, 
  onStartLocationChange, 
  onEndLocationChange, 
  onTransportModeChange,
  onWheelchairModeChange // Nouveau handler
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>✨Planifier un itinéraire✨</Text>
          
          {/* Input départ */}
          <View style={styles.inputContainer}>
            <Ionicons name="location" size={24} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Point de départ"
              value={startLocation}
              onChangeText={onStartLocationChange}
            />
          </View>
          
          {/* Input arrivée */}
          <View style={[styles.inputContainer,{}]}>
            <View style={{width: 5}}></View>
            <FontAwesome5 name="flag-checkered" size={20} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Destination"
              value={endLocation}
              onChangeText={onEndLocationChange}
              
            />
          </View>
          
          {/* Choix du mode de transport */}
          <View style={styles.transportContainer}>
            <TouchableOpacity
              style={[styles.transportButton, transportMode === 'walking' && styles.selectedTransport]}
              onPress={() => onTransportModeChange('walking')}
            >
              <Ionicons name="walk" size={24} color={transportMode === 'walking' ? "white" : "black"} />
              <Text style={transportMode === 'walking' ? styles.selectedTransportText : styles.transportText}>Marche</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.transportButton, transportMode === 'bicycle' && styles.selectedTransport]}
              onPress={() => onTransportModeChange('bicycle')}
            >
              <Ionicons name="bicycle" size={24} color={transportMode === 'bicycle' ? "white" : "black"} />
              <Text style={transportMode === 'bicycle' ? styles.selectedTransportText : styles.transportText}>Vélo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.transportButton, transportMode === 'car' && styles.selectedTransport]}
              onPress={() => onTransportModeChange('car')}
            >
              <Ionicons name="car" size={24} color={transportMode === 'car' ? "white" : "black"} />
              <Text style={transportMode === 'car' ? styles.selectedTransportText : styles.transportText}>Voiture</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.transportButton, transportMode === 'bus' && styles.selectedTransport]}
              onPress={() => onTransportModeChange('bus')}
            >
              <Ionicons name="bus" size={24} color={transportMode === 'bus' ? "white" : "black"} />
              <Text style={transportMode === 'bus' ? styles.selectedTransportText : styles.transportText}>Transport</Text>
            </TouchableOpacity>
          </View>
          
          {/* Option d'accessibilité en fauteuil roulant */}
          <View style={styles.accessibilityContainer}>
            <View style={styles.switchContainer}>
              <Ionicons name="accessibility" size={24} color="#4285F4" />
              <Text style={styles.switchLabel}>Mode accessible</Text>
              <Switch
                value={wheelchairMode}
                onValueChange={onWheelchairModeChange}
                trackColor={{ false: "#D1D1D6", true: "#81b0ff" }}
                thumbColor={wheelchairMode ? "#4285F4" : "#f4f3f4"}
              />
            </View>
            <Text style={styles.accessibilityHint}>
              Privilégier les itinéraires accessibles en fauteuil roulant
            </Text>
          </View>
          
          {/* Bouton de recherche */}
          <TouchableOpacity 
            style={styles.routeButton} 
            onPress={onSearch}
            disabled={loading}
          >
            <Text style={styles.routeButtonText}>
              {loading ? 'Recherche...' : 'Rechercher'}
            </Text>
          </TouchableOpacity>
          
          {/* Bouton pour réduire le modal */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="chevron-down" size={24} color="black" />
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
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    height: 40,
    fontWeight: '500',
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
  accessibilityContainer: {
    marginVertical: 10,
    paddingVertical: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  switchLabel: {
    flex: 1,
    marginLeft: 10,
    fontWeight: '500',
  },
  accessibilityHint: {
    fontSize: 12,
    color: '#666',
    marginLeft: 34, // Aligner avec le texte du label
  },
});

export default RouteModal;