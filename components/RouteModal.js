import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, Text, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Switch } from 'react-native';
import { adresseAutocomplete } from '../assets/api';

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
  onBikeSpeedChange,  // New handler
  safetyModeForWomen = false,
  onSafetyModeChange,
}) => {
  // State for autocomplete suggestions
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  
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
  
  // Function to handle autocomplete
  const handleAutocomplete = async (text, isStart) => {
    if (isStart) {
      onStartLocationChange(text);
    } else {
      onEndLocationChange(text);
    }
    
    if (text.length > 2) {
      try {
        const suggestions = await adresseAutocomplete(text);
        if (isStart) {
          setStartSuggestions(suggestions);
          setShowStartSuggestions(true);
        } else {
          setEndSuggestions(suggestions);
          setShowEndSuggestions(true);
        }
      } catch (error) {
        console.error("Erreur lors de l'autocomplétion:", error);
      }
    } else {
      // If input is too short, clear suggestions but show the "my position" option
      if (isStart) {
        setStartSuggestions([]);
        setShowStartSuggestions(text.length === 0); // Show only if field is empty
      } else {
        setEndSuggestions([]);
        setShowEndSuggestions(text.length === 0); // Show only if field is empty
      }
    }
  };

  // Handle selection of a suggestion
  const handleSelectSuggestion = (suggestion, isStart) => {
    let value = "";
    
    if (suggestion === "position") {
      value = "Ma position";
    } else if (suggestion.properties) {
      value = suggestion.properties.label;
    }
    
    if (isStart) {
      onStartLocationChange(value);
      setShowStartSuggestions(false);
    } else {
      onEndLocationChange(value);
      setShowEndSuggestions(false);
    }
  };
  
  // Render suggestion item
  const renderSuggestionItem = (item, isStart) => {
    if (item === "position") {
      return (
        <TouchableOpacity
          style={styles.suggestionItem}
          onPress={() => handleSelectSuggestion("position", isStart)}
        >
          <Ionicons name="location" size={20} color="#4285F4" />
          <Text style={styles.suggestionText}>Ma position</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.suggestionItem}
          onPress={() => handleSelectSuggestion(item, isStart)}
        >
          <Ionicons name="location-outline" size={20} color="#888" />
          <Text style={styles.suggestionText}>{item.properties.label}</Text>
        </TouchableOpacity>
      );
    }
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
          {/* Marcus image in top-left corner */}
          <Image 
            source={require('../assets/image/marcus-bas.png')} 
            style={styles.marcusImage}
            resizeMode="contain"
            pointerEvents="none"
          />
          
          <Text style={styles.modalTitle}> Planifie l'itinéraire</Text>
          
          {/* Input départ */}
          <View>
            <View style={styles.inputContainer}>
              <View style={{width: 5}}></View>
              <Ionicons name="location" size={22} color="#888" />
              <TextInput
                style={styles.input}
                placeholder="Point de départ"
                value={startLocation}
                onChangeText={(text) => handleAutocomplete(text, true)}
                onFocus={() => setShowStartSuggestions(true)}
                onSubmitEditing={() => setShowStartSuggestions(false)}
              />
            </View>
            
            {/* Suggestions for start location */}
            {showStartSuggestions && (
              <View style={styles.suggestionsContainer}>
                {startLocation.length === 0 && (
                  <View>
                    {renderSuggestionItem("position", true)}
                  </View>
                )}
                {startSuggestions.map((suggestion, index) => (
                  <View key={index}>
                    {renderSuggestionItem(suggestion, true)}
                  </View>
                ))}
              </View>
            )}
          </View>
          
          {/* Input arrivée */}
          <View>
            <View style={styles.inputContainer}>
              <View style={{width: 10}}></View>
              <FontAwesome5 name="flag-checkered" size={18} color="#888" />
              <TextInput
                style={styles.input}
                placeholder="Destination"
                value={endLocation}
                onChangeText={(text) => handleAutocomplete(text, false)}
                onFocus={() => setShowEndSuggestions(true)}
                onSubmitEditing={() => setShowEndSuggestions(false)}

              />
            </View>
            
            {/* Suggestions for end location */}
            {showEndSuggestions && (
              <View style={styles.suggestionsContainer}>
                {endLocation.length === 0 && (
                  <View>
                    {renderSuggestionItem("position", false)}
                  </View>
                )}
                {endSuggestions.map((suggestion, index) => (
                  <View key={index}>
                    {renderSuggestionItem(suggestion, false)}
                  </View>
                ))}
              </View>
            )}
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
                  Vitesse: {currentSpeed.toFixed(1)} m/s
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
          
          {/* Option pour mode sécurité femmes */}
          {/* <View style={styles.accessibilityContainer}>
            <View style={styles.switchContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#E91E63" />
              <Text style={styles.switchLabel}>Mode sécurité femmes</Text>
              <Switch
                value={safetyModeForWomen}
                onValueChange={onSafetyModeChange}
                trackColor={{ false: "#D1D1D6", true: "#ffb6c1" }}
                thumbColor={safetyModeForWomen ? "#E91E63" : "#f4f3f4"}
              />
            </View>
            <Text style={styles.accessibilityHint}>
              Privilégier les itinéraires sécurisés et éviter certains quartiers la nuit
            </Text>
          </View> */}
          
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
  // Add the new style for Marcus image
  marcusImage: {
    position: 'absolute',
    width: 500,
    height: 500,
    top: -230,
    left: -185,
    zIndex: 10,
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
    marginBottom: 40,
    marginTop: 13,
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
  suggestionsContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: -10,
    marginBottom: 10,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 14,
  },
});

export default RouteModal;