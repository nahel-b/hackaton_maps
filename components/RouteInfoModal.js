import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal, View, Text, ScrollView, TouchableOpacity, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { selectAppropriateItinerary, hasTransitSegments } from '../utils/routeUtils';
import { itineraire } from '../assets/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const FULL_MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;
const MINIMIZED_MODAL_HEIGHT = 120;

const RouteInfoModal = ({ 
  visible, 
  routeData, 
  onClose, 
  transportMode, 
  stopTimesData = {}, 
  impactData = null,
  onChangeTransportMode,
  onReset, 
  onMinimize 
}) => {
  const [modalHeight] = useState(new Animated.Value(FULL_MODAL_HEIGHT));
  const [isMinimized, setIsMinimized] = useState(false);
  const [multiModeRoutes, setMultiModeRoutes] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // All useEffects and other hooks must be here at the top level - no early returns before this
  useEffect(() => {
    if (visible && routeData && routeData.plan && routeData.plan.itineraries.length > 0) {
      const firstItinerary = routeData.plan.itineraries[0];
      if (firstItinerary && firstItinerary.legs && firstItinerary.legs.length > 0) {
        const firstLeg = firstItinerary.legs[0];
        const lastLeg = firstItinerary.legs[firstItinerary.legs.length - 1];
        
        if (firstLeg.from && lastLeg.to) {
          const startCoords = {
            lat: firstLeg.from.lat,
            lon: firstLeg.from.lon
          };
          
          const endCoords = {
            lat: lastLeg.to.lat,
            lon: lastLeg.to.lon
          };
          
          fetchAllModeRoutes(startCoords, endCoords);
        }
      }
    }
  }, [visible, routeData]);

  // Create pan responder and other non-hook logic
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to vertical gestures near the top of the modal
      // return gestureState.dy > 0 && evt.nativeEvent.locationY < 50;
      false;
    },
    onPanResponderMove: (e, gesture) => {
      if (gesture.dy > 0) { // Dragging down
        modalHeight.setValue(FULL_MODAL_HEIGHT - gesture.dy);
      }
    },
    onPanResponderRelease: (e, gesture) => {
      if (gesture.dy > 100) {
        // User dragged down significantly, minimize modal
        onMinimize();
      } else {
        // Return to full height
        expandModal();
      }
    }
  });

  // Function declarations
  const minimizeModal = () => {
    Animated.timing(modalHeight, {
      toValue: MINIMIZED_MODAL_HEIGHT,
      duration: 300,
      useNativeDriver: false
    }).start(() => setIsMinimized(true));
  };

  const expandModal = () => {
    Animated.timing(modalHeight, {
      toValue: FULL_MODAL_HEIGHT,
      duration: 300,
      useNativeDriver: false
    }).start(() => setIsMinimized(false));
  };

  const fetchAllModeRoutes = async (startCoords, endCoords) => {
    setLoadingRoutes(true);
    const modes = ['walking', 'bicycle', 'bus', 'car'];
    const routes = {};
    
    try {
      // Get API transport mode from UI mode
      const modeMap = {
        'walking': 'WALK',
        'bicycle': 'BICYCLE', 
        'bus': 'TRANSIT',
        'car': 'CAR'
      };
      
      // Fetch routes for each mode
      for (const mode of modes) {
        const apiMode = modeMap[mode] || 'WALK';
        const result = await itineraire(startCoords, endCoords, apiMode);
        if (result && result.plan && result.plan.itineraries && result.plan.itineraries.length > 0) {
          const itinerary = selectAppropriateItinerary(result.plan.itineraries, apiMode);
          if (itinerary) {
            routes[mode] = itinerary;
          }
        }
      }
      
      setMultiModeRoutes(routes);
    } catch (error) {
      console.error('Error fetching routes for all modes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Any other functions...
  // ...

  // NOW you can do early returns - AFTER all hook calls
  if (!visible || !routeData || !routeData.plan || !routeData.plan.itineraries || routeData.plan.itineraries.length === 0) {
    return null;
  }

  // Get API transport mode from UI mode
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
  
  // Select appropriate itinerary
  const itinerary = selectAppropriateItinerary(routeData.plan.itineraries, apiMode);
  if (!itinerary) return null;
  
  // Formatting helpers
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
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatStopTime = (serviceDay, seconds) => {
    const date = new Date((serviceDay + seconds) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get icon for transport mode
  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walking': return 'walk';
      case 'bicycle': return 'bicycle';
      case 'car': return 'car';
      case 'bus': return 'bus';
      default: return 'navigate';
    }
  };

  // Extract transit stops with timing info
  const getTransitStops = () => {
    const transitStops = [];
    
    // Only process if itinerary has legs
    if (itinerary && itinerary.legs) {
      itinerary.legs.forEach((leg, index) => {
        if (['BUS', 'TRAM'].includes(leg.mode)) {
          const routeId = leg.routeShortName || leg.route;
          const stopName = leg.from && leg.from.name;
          
          if (routeId && stopName) {
            transitStops.push({
              mode: leg.mode,
              route: routeId,
              stopName: stopName,
              index: index,
              headsign: leg.headsign || '',
              color: leg.mode === 'TRAM' ? getTramColor(routeId) : '#0D47A1'
            });
          }
        }
      });
    }
    return transitStops;
  };
  
  const getTramColor = (tram) => {
    // Mapping des couleurs de tram
    const tramColors = {
        "A": "#3376B8",
        "B": "#479A45",
        "C": "#C20078",
        "D": "#DE9917",
        "E": "#533786"
    };
    
    // Si le tram existe dans notre mapping, retourner sa couleur
    if (tramColors[tram]) {
        return tramColors[tram];
    }
    
    // Couleur par défaut
    return "#777777";
  };

  const transitStops = getTransitStops();

  // Add a new section to display environmental impact
  const renderEnvironmentalImpact = () => {
    // Vérifiez que impactData est un tableau non vide
    if (!impactData || !Array.isArray(impactData) || impactData.length === 0) {
      console.log("e"); 
      return null;
    }
    
    // Les modes que nous voulons afficher avec leurs durées
    const modesConfig = [
      { id: 'walking', name: 'Marche', icon: 'walk', color: '#43A047', apiMode: 'WALK' },
      { id: 'bicycle', name: 'Vélo', icon: 'bicycle', color: '#1E88E5', apiMode: 'BICYCLE' },
      { id: 'bus', name: 'Transport', icon: 'bus', color: '#7B1FA2', apiMode: 'TRANSIT' },
      { id: 'car', name: 'Voiture', icon: 'car', color: '#E53935', apiMode: 'CAR' }
    ];
    
    // Fonction pour associer les IDs de l'API impactCO2 à nos modes UI
    const mapApiIdToUiMode = (apiId) => {
      const mapping = {
        '30': 'walking',   // Marche
        '7': 'bicycle',    // Vélo
        '4': 'car',        // Voiture thermique
        '5': 'car',        // Voiture électrique (on utilise le même)
        '9': 'bus',        // Bus thermique
        '16': 'bus',       // Bus électrique
        '10': 'bus'        // Tram (on le met avec bus pour simplifier)
      };
      return mapping[apiId] || null;
    };
    
    return (
      <View style={styles.environmentalImpactContainer}>
        {loadingRoutes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4285F4" />
            <Text style={styles.loadingText}>Calcul des itinéraires...</Text>
          </View>
        ) : (
          <View style={styles.transportModesGrid}>
            {modesConfig.map((mode) => {
              // Trouver les données d'impact correspondant à ce mode
              const modeImpactData = Array.isArray(impactData) ? impactData.find(item => 
                item && item.id && mapApiIdToUiMode(item.id.toString()) === mode.id
              ) : null;
              
              // Get duration from pre-fetched routes
              const modeItinerary = multiModeRoutes[mode.id];
              const duration = modeItinerary ? modeItinerary.duration : null;
              const durationText = duration ? formatDuration(duration) : "Calcul...";
              
              // Si on n'a pas de données pour ce mode, on l'affiche quand même
              const co2Value = modeImpactData ? 
                `${modeImpactData.value.toFixed(1)} kgCO₂e` : 
                'Non disponible';
                
              const isActive = transportMode === mode.id;
              
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.transportModeItem,
                    isActive && { borderColor: mode.color, borderWidth: 2 }
                  ]}
                  onPress={() => onChangeTransportMode(mode.id)}
                >
                  <View style={[styles.transportModeIcon, { backgroundColor: mode.color }]}>
                    <Ionicons name={mode.icon} size={20} color="white" />
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'left', marginLeft: 10 }}>
                    <Text style={styles.transportModeName}>{durationText}</Text>
                    <View style={styles.co2Container}>
                      <FontAwesome name="leaf" size={12} color="#666" />
                      <Text style={styles.co2Value}>{co2Value}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
    >
      <View 
      
        style={[
          styles.centeredView, 
          isMinimized && { backgroundColor: 'transparent' },
          {backgroundColor : "transparent"}
        ]} 
      >
        <Animated.View 
          style={[
            styles.modalView, 
            { height: modalHeight },
            // Add position absolute when minimized to avoid taking up layout space
            isMinimized && { 
              position: 'absolute', 
              bottom: 0,
              left: 0,
              right: 0
            }
          ]}
          // Add pointerEvents to the Animated.View as well
          //pointerEvents={isMinimized ? 'box-none' : 'auto'}
          {...(isMinimized ? {} : panResponder.panHandlers)}
        >
          {/* Drag handle */}
          {/* <View style={[styles.dragHandle,]}>
            <View style={styles.dragHandleBar} />
          </View>
           */}
          {isMinimized ? (
            // Minimized view
            <TouchableOpacity 
              style={styles.minimizedContent} 
              onPress={expandModal}
              activeOpacity={0.9}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={getTransportIcon(transportMode)} size={24} color="#4285F4" />
              </View>
              <View style={styles.minimizedInfo}>
                <Text style={styles.minimizedDuration}>{formatDuration(itinerary.duration)}</Text>
                <Text style={styles.minimizedDistance}>{formatDistance(itinerary.walkDistance)}</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeRouteButton}
                onPress={onReset}
              >
                <Ionicons name="close" size={24} color="#FF5252" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails de l'itinéraire</Text>
                <TouchableOpacity 
                  style={styles.closeRouteButton}
                  onPress={onMinimize}
                >
                  <Ionicons name="chevron-down" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
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

                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollViewContent}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Section impact environnemental */}
                  {renderEnvironmentalImpact()}

                  {/* Informations détaillées */}
                  {/* <View style={styles.infoRow}>
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
                  </View> */}

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
                  
                  {/* Transit stops and departure times */}
                  {transitStops.length > 0 && (
                    <View style={styles.transitTimesContainer}>
                      <Text style={styles.sectionTitle}>Prochains départs:</Text>
                      {transitStops.map((stop, stopIndex) => {
                        console.log(JSON.stringify(stopTimesData));
                        const stopData = stopTimesData[stopIndex] ? stopTimesData[stopIndex].find(data => {
                          // Basic validation
                          if (!data || !data.pattern) return false;
                          
                          const pattern = data.pattern;
                          
                          // For bus routes
                          if (stop.mode === 'BUS') {
                            // Extract numbers from route
                            const routeNumber = stop.route;
                            
                            // Extract route number from pattern ID
                            const patternMatch = pattern.id.match(/SEM:(\d+):/);
                            const patternNumber = patternMatch ? patternMatch[1] : '';
                            
                            // Check for direct match
                            return patternNumber === routeNumber;
                          } 
                          // For trams
                          else {
                            // Direct match for tram letters
                            return pattern.id.includes(`:${stop.route}:`);
                          }
                        }) : null;

                        // If no matching found, try a more generic approach
                        const fallbackData = !stopData && stopTimesData[stopIndex] && stopTimesData[stopIndex][0];
                        const dataToUse = stopData || fallbackData;
                        
                        return (
                          <View key={stopIndex} style={styles.transitStopContainer}>
                            <View style={[styles.transitRouteTag, { backgroundColor: stop.color }]}>
                              <Text style={styles.transitRouteText}>{stop.route}</Text>
                            </View>
                            <View style={styles.transitStopInfo}>
                              <Text style={styles.transitStopName}>{stop.stopName}</Text>
                              {stop.headsign && (
                                <Text style={styles.transitHeadsign}>Direction: {stop.headsign}</Text>
                              )}
                              <View style={styles.transitTimesWrapper}>
                                {!dataToUse || !dataToUse.times ? (
                                  <Text style={styles.noTimesText}>Horaires non disponibles</Text>
                                ) : (
                                  dataToUse.times.slice(0, 3).map((time, timeIndex) => (
                                    <View key={timeIndex} style={styles.transitTimeItem}>
                                      <Text style={styles.transitTime}>
                                        {formatStopTime(time.serviceDay, time.realtimeDeparture)}
                                        {time.realtime && " "}
                                        {time.realtime && <Text style={styles.realtimeIndicator}>•</Text>}
                                      </Text>
                                    </View>
                                  ))
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
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
                            <Text style={styles.legMode}>
                              {leg.mode === 'WALK' ? 'Marche' : 
                               leg.mode === 'BICYCLE' ? 'Vélo' : 
                               leg.mode === 'CAR' ? 'Voiture' : 
                               // For transit modes, display line and direction when available
                                 leg.routeShortName ? (
                                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                   <View style={[
                                   { 
                                    paddingHorizontal: 4,
                                    minHeight : 20,
                                    minWidth : 20,
                                    aspectRatio: 1,
                                    borderRadius: 17.5,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 5,
                                  }, 
                                   {backgroundColor: leg.mode === 'TRAM' ? 
                                     getTramColor(leg.routeShortName) : 
                                     '#0D47A1'}
                                   ]}>
                                   <Text style={{fontSize : 13,color : "white",fontWeight : "bold"}}>{leg.routeShortName}</Text>
                                   </View>
                                   {leg.headsign && (
                                   <Text style={styles.headsignText}>→ {leg.headsign}</Text>
                                   )}
                                 </View>
                                 ) : leg.headsign ? (
                                 <View style={styles.routeWithHeadsign}>
                                   <Text>Transport en commun</Text>
                                   <Text style={styles.headsignText}>→ {leg.headsign}</Text>
                                 </View>
                                 ) : 'Transport en commun'}
                              </Text>
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
                onPress={onReset}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    height: FULL_MODAL_HEIGHT,
  },
  dragHandle: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  dragHandleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ddd',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    flex : 1
   //paddingBottom: SCREEN_HEIGHT * 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
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
  minimizeButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  minimizedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  minimizedInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  minimizedDuration: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  minimizedDistance: {
    marginLeft: 10,
    color: '#666',
  },
  closeRouteButton: {
    padding: 8,
  },
  transitTimesContainer: {
    marginTop: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  transitStopContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transitRouteTag: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transitRouteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  transitStopInfo: {
    flex: 1,
  },
  transitStopName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  transitHeadsign: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  transitTimesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  transitTimeItem: {
    marginRight: 10,
    marginBottom: 5,
    backgroundColor: '#e9f5ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transitTime: {
    fontSize: 13,
  },
  realtimeIndicator: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noTimesText: {
    fontStyle: 'italic',
    color: '#999',
    fontSize: 12,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  // Nouveaux styles pour la section d'impact environnemental
  environmentalImpactContainer: {
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  impactDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  transportModesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  transportModeItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
  },
  transportModeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    //marginBottom: 6,
  },
  transportModeName: {
    fontSize: 14,
    fontWeight: 'bold',
    //marginBottom: 4,
  },
  co2Container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  co2Value: {
    fontSize: 12,
    marginLeft: 4,
    color: '#555',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
});

export default RouteInfoModal;