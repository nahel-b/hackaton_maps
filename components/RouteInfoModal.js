import React, { useState, useEffect } from 'react';
import { StyleSheet, Modal,Image, View, Text, ScrollView, TouchableOpacity, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
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

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
     
      false;
    },
    onPanResponderMove: (e, gesture) => {
      if (gesture.dy > 0) { 
        modalHeight.setValue(FULL_MODAL_HEIGHT - gesture.dy);
      }
    },
    onPanResponderRelease: (e, gesture) => {
      if (gesture.dy > 100) {
        onMinimize();
      } else {
        expandModal();
      }
    }
  });

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

      const modeMap = {
        'walking': 'WALK',
        'bicycle': 'BICYCLE', 
        'bus': 'TRANSIT',
        'car': 'CAR'
      };
      

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

  if (!visible || !routeData || !routeData.plan || !routeData.plan.itineraries || routeData.plan.itineraries.length === 0) {
    return null;
  }

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
  

  const itinerary = selectAppropriateItinerary(routeData.plan.itineraries, apiMode);
  if (!itinerary) return null;
  

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


  const getTransportIcon = (mode) => {
    switch(mode) {
      case 'walking': return 'walk';
      case 'bicycle': return 'bicycle';
      case 'car': return 'car';
      case 'bus': return 'bus';
      default: return 'navigate';
    }
  };


  const getTransitStops = () => {
    const transitStops = [];
    

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

    const tramColors = {
        "A": "#3376B8",
        "B": "#479A45",
        "C": "#C20078",
        "D": "#DE9917",
        "E": "#533786"
    };
    

    if (tramColors[tram]) {
        return tramColors[tram];
    }
    

    return "#777777";
  };

  const transitStops = getTransitStops();


  const renderEnvironmentalImpact = () => {

    if (!impactData || !Array.isArray(impactData) || impactData.length === 0) {
      console.log("e"); 
      return null;
    }
    

    const modesConfig = [
      { id: 'walking', name: 'Marche', icon: 'walk', color: '#43A047', apiMode: 'WALK' },
      { id: 'bicycle', name: 'Vélo', icon: 'bicycle', color: '#1E88E5', apiMode: 'BICYCLE' },
      { id: 'bus', name: 'Transport', icon: 'bus', color: '#7B1FA2', apiMode: 'TRANSIT' },
      { id: 'car', name: 'Voiture', icon: 'car', color: '#E53935', apiMode: 'CAR' }
    ];
    

    const mapApiIdToUiMode = (apiId) => {
      const mapping = {
        '30': 'walking',   
        '7': 'bicycle',    
        '4': 'car',       
        '5': 'car',       
        '9': 'bus',       
        '16': 'bus',      
        '10': 'bus'      
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

                const modeImpactData = Array.isArray(impactData) ? impactData.find(item => 
                item && item.id && mapApiIdToUiMode(item.id.toString()) === mode.id
              ) : null;
              

              const modeItinerary = multiModeRoutes[mode.id];
              const duration = modeItinerary ? modeItinerary.duration : null;
              const durationText = duration ? formatDuration(duration) : "Calcul...";
              

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


  
const renderMarcusEcoSuggestion = () => {

  if (transportMode !== 'car') return null;
  

  const carItinerary = multiModeRoutes['car'];
  const walkItinerary = multiModeRoutes['walking'];
  const bikeItinerary = multiModeRoutes['bicycle'];
  
  if (!carItinerary || !walkItinerary || !bikeItinerary) return null;
  

  const carDurationMins = Math.round(carItinerary.duration / 60);
  const walkDurationMins = Math.round(walkItinerary.duration / 60);
  const bikeDurationMins = Math.round(bikeItinerary.duration / 60);
  

  const findImpactData = (mode) => {
    const modeMapping = { 'car': '4', 'walking': '30', 'bicycle': '7' };
    return impactData?.find(item => item?.id?.toString() === modeMapping[mode]);
  };
  
  const carImpact = findImpactData('car');
  const walkImpact = findImpactData('walking');
  const bikeImpact = findImpactData('bicycle');
  

  const walkingSavings = carImpact && walkImpact ? 
    (carImpact.value - walkImpact.value).toFixed(1) : 0;
  const bikeSavings = carImpact && bikeImpact ? 
    (carImpact.value - bikeImpact.value).toFixed(1) : 0;
  

  if (walkDurationMins < 15) {
    return (
      <View style={styles.marcusSuggestionContainer}>
        <Image 
          source={require('../assets/image/marcus-fache.gif')} 
          style={styles.marcusSuggestionImage} 
          resizeMode="contain"
        />
        <View style={styles.marcusBubble}>
          <View style={styles.marcusTitleContainer}>
            <Ionicons name="bulb" size={18} color="#FFA000" />
            <Text style={styles.marcusSuggestionTitle}>Un conseil de Marcus</Text>
          </View>
          
          <Text style={styles.marcusSuggestionText}>
            Ce trajet est assez court pour être fait à pied !
          </Text>
          
          <View style={styles.marcusInfoRow}>
            <View style={styles.marcusIconContainer}>
              <Ionicons name="leaf" size={16} color="#4CAF50" />
            </View>
            <Text style={styles.marcusHighlightText}>
              Économisez <Text style={{fontWeight: 'bold', color: '#4CAF50'}}>{walkingSavings} kgCO₂e</Text> en marchant
            </Text>
          </View>
          
          <View style={styles.marcusInfoRow}>
            <View style={styles.marcusIconContainer}>
              <Ionicons name="time" size={16} color="#FF5722" />
            </View>
            <Text style={styles.marcusHighlightText}>
              Durée à pied : <Text style={{fontWeight: 'bold'}}>{walkDurationMins} min</Text>
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.marcusActionButton} 
            onPress={() => onChangeTransportMode('walking')}
          >
            <Text style={styles.marcusActionText}>Voir l'itinéraire à pied</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (bikeDurationMins - carDurationMins <= 20) {
    return (
      <View style={styles.marcusSuggestionContainer}>
        <Image 
          source={require('../assets/image/marcus-fache.gif')} 
          style={styles.marcusSuggestionImage} 
          resizeMode="contain"
        />
        <View style={styles.marcusBubble}>
          <View style={styles.marcusTitleContainer}>
            <Ionicons name="bulb" size={18} color="#FFA000" />
            <Text style={styles.marcusSuggestionTitle}>Un conseil de Marcus</Text>
          </View>
          
          <Text style={styles.marcusSuggestionText}>
            Pourquoi ne pas prendre le vélo ?
          </Text>
          
          <View style={styles.marcusInfoRow}>
            <View style={styles.marcusIconContainer}>
              <Ionicons name="time" size={16} color="#FF5722" />
            </View>
            <Text style={styles.marcusHighlightText}>
              Seulement <Text style={{fontWeight: 'bold'}}>{bikeDurationMins - carDurationMins} min</Text> de plus
            </Text>
          </View>
          
          <View style={styles.marcusInfoRow}>
            <View style={styles.marcusIconContainer}>
              <Ionicons name="leaf" size={16} color="#4CAF50" />
            </View>
            <Text style={styles.marcusHighlightText}>
              Économisez <Text style={{fontWeight: 'bold', color: '#4CAF50'}}>{bikeSavings} kgCO₂e</Text> de CO₂
            </Text>
          </View>
          
          <View style={styles.marcusInfoRow}>
            <View style={styles.marcusIconContainer}>
              <FontAwesome5 name="equals" size={14} color="#666" />
            </View>
            <Text style={styles.marcusHighlightText}>
              Équivalent à {(() => {
                // Provide more varied equivalents based on CO2 savings value
                if (bikeSavings > 2) {
                  return `${Math.round(bikeSavings * 3)} douches économisées`;
                } else if (bikeSavings > 1) {
                  return `${Math.round(bikeSavings * 5)} km en voiture`;
                } else if (bikeSavings > 0.5) {
                  return `${Math.round(bikeSavings * 50)} smartphones rechargés`;
                } else {
                  return `${Math.round(bikeSavings * 100)} heures d'ampoule LED`;
                }
              })()}
            </Text>
          </View>
          
          {bikeSavings > 0.8 && (
            <View style={styles.marcusInfoRow}>
              <View style={styles.marcusIconContainer}>
                <MaterialCommunityIcons name="food-apple" size={16} color="#8BC34A" />
              </View>
              <Text style={styles.marcusHighlightText}>
                Ou {Math.round(bikeSavings * 2)} repas sans viande
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.marcusActionButton} 
            onPress={() => onChangeTransportMode('bicycle')}
          >
            <Text style={styles.marcusActionText}>Voir l'itinéraire à vélo</Text>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return null;
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
            isMinimized && { 
              position: 'absolute', 
              bottom: 0,
              left: 0,
              right: 0
            }
          ]}
          {...(isMinimized ? {} : panResponder.panHandlers)}
        >
         
          {isMinimized ? (
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
                  {renderEnvironmentalImpact()}

                  {renderMarcusEcoSuggestion()}

                 
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
                  
                  {transitStops.length > 0 && (
                    <View style={styles.transitTimesContainer}>
                      <Text style={styles.sectionTitle}>Prochains départs:</Text>
                      {transitStops.map((stop, stopIndex) => {
                        console.log(JSON.stringify(stopTimesData));
                        const stopData = stopTimesData[stopIndex] ? stopTimesData[stopIndex].find(data => {
                          if (!data || !data.pattern) return false;
                          
                          const pattern = data.pattern;
                          
                          if (stop.mode === 'BUS') {
                            const routeNumber = stop.route;
                            
                            const patternMatch = pattern.id.match(/SEM:(\d+):/);
                            const patternNumber = patternMatch ? patternMatch[1] : '';
                            
                            return patternNumber === routeNumber;
                          } 

                          else {

                            return pattern.id.includes(`:${stop.route}:`);
                          }
                        }) : null;


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
                                   <Text style={{width : "90%"}}>→ {leg.headsign}</Text>
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
  },
  transportModeName: {
    fontSize: 14,
    fontWeight: 'bold',
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
  marcusSuggestionContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(230, 246, 255, 0.8)',
    borderRadius: 16,
    padding: 5,
    marginVertical: 0,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEE3F8',
  },
  marcusSuggestionImage: {
    width: 80,
    height: 200,
    marginRight: 5,
    resizeMode: "cover",
  },
  marcusBubble: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  marcusTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marcusSuggestionTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#2B6CB0',
    marginLeft: 6,
  },
  marcusSuggestionText: {
    fontSize: 14,
    color: '#2D3748',
    marginBottom: 10,
  },
  marcusInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marcusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  marcusHighlightText: {
    fontSize: 13,
    width : "90%",
    color: '#4A5568',
  },
  marcusActionButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcusActionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    marginRight: 5,
  },
});

export default RouteInfoModal;