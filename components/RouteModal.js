import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Switch } from 'react-native';

const RouteModal = ({ 
  visible, 
  startLocation, 
  endLocation, 
  transportMode, 
  wheelchairMode,
  walkSpeed = 3,  // Default walk speed
  bikeSpeed = 11, // Default bike speed
  loading,
  onClose, 
  onSearch, 
  onStartLocationChange, 
  onEndLocationChange, 
  onTransportModeChange,
  onWheelchairModeChange,
  onWalkSpeedChange, // New handler
  onBikeSpeedChange  // New handler
}) => {
  
  // Function to get speed text and color based on value
  const getSpeedInfo = (isWalking, speed) => {
    let text = "Normal";
    let color = "#4285F4"; // Default blue color
    
    if (isWalking) {
      // Walking speed categories
      if (speed <= 2) {
        text = "Lent";
        color = "#FF9800"; // Orange
      } else if (speed >= 4) {
        text = "Rapide";
        color = "#4CAF50"; // Green
      }
    } else {
      // Biking speed categories
      if (speed <= 8) {
        text = "Lent";
        color = "#FF9800"; // Orange
      } else if (speed >= 14) {
        text = "Rapide"; 
        color = "#4CAF50"; // Green
      }
    }
    
    return { text, color };
  };
  
  // Get speed info for current mode
  const isWalking = transportMode === 'walking';
  const currentSpeed = isWalking ? walkSpeed : bikeSpeed;
  const speedInfo = getSpeedInfo(isWalking, currentSpeed);

  // Reset speeds when transport mode changes
  useEffect(() => {
    if (transportMode === 'walking') {
      onWalkSpeedChange(3); // Reset to default walking speed
    } else if (transportMode === 'bicycle') {
      onBikeSpeedChange(11); // Reset to default biking speed
    }
  }, [transportMode]);

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
          <View style={{width: 5}}></View>

            <Ionicons name="location" size={22} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Point de départ"
              value={startLocation}
              onChangeText={onStartLocationChange}
            />
          </View>
          
          {/* Input arrivée */}
          <View style={[styles.inputContainer,{}]}>
            <View style={{width: 10}}></View>
            <FontAwesome5 name="flag-checkered" size={18} color="#888" />
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
          
          {/* Speed control slider - only shown for walking and bicycle */}
          {(transportMode === 'walking' || transportMode === 'bicycle') && (
            <View style={styles.speedContainer}>
              <View style={styles.speedLabelContainer}>
                <Text style={styles.speedLabel}>
                  Vitesse: {currentSpeed.toFixed(1)} mph
                </Text>
                <Slider
                key={`speed-slider-${transportMode}`}
                style={styles.speedSlider}
                minimumValue={transportMode === 'walking' ? 1 : 5}
                maximumValue={transportMode === 'walking' ? 5 : 17}
                
                step={0.5}
                value={currentSpeed}
                onValueChange={transportMode === 'walking' ? onWalkSpeedChange : onBikeSpeedChange}
                minimumTrackTintColor={speedInfo.color}
                maximumTrackTintColor="#d3d3d3"
                thumbTintColor={speedInfo.color}
                
              />
                <Text style={[styles.speedCategory, { color: speedInfo.color }]}>
                  {speedInfo.text}
                </Text>
              </View>
              
            </View>
          )}
          
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

// Example for your parent component
const onTransportModeChange = (mode) => {
  setTransportMode(mode);
  
  // Reset speeds to appropriate defaults when changing modes
  if (mode === 'walking') {
    setWalkSpeed(3); // Corrected from setCurr
  } else if (mode === 'bicycle') {
    setBikeSpeed(11); 
  }
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
    padding: 5,
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
  // New styles for speed control
  speedContainer: {
    marginBottom: 0,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  speedLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  speedLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  speedCategory: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  speedSlider: {
    width: '50%',
    height: 10,
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