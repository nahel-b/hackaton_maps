import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getStopCodeByName } from '../utils/stopUtils';
import * as Location from 'expo-location';
import routesData from '../assets/routes.json';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWeather, getAirPollution } from '../assets/api';

const RouteMap = ({ 
  region, 
  routeCoordinates, 
  startCoords, 
  endCoords, 
  transitPoints = [], 
  stopTimesData = {}, 
  onRegionChangeComplete 
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const [showFountains, setShowFountains] = useState(false);
  const [showToilets, setShowToilets] = useState(false);
  const [showMuseums, setShowMuseums] = useState(false);
  const [show3DBuildings, setShow3DBuildings] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [pollutionData, setPollutionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getLocationPermission = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };
    
    getLocationPermission();
  }, []);

  const getTransitIcon = (mode) => {
    console.log('Mode:', mode);
    switch(mode) {
      case 'BUS': return <FontAwesome5 name="bus" size={18} color="white" />;
      case 'TRAM': return <MaterialIcons name="tram" size={18} color="white" />;
      case 'SUBWAY': return <FontAwesome5 name="subway" size={18} color="white" />;
      case 'RAIL': return <MaterialIcons name="train" size={18} color="white" />;
      case 'WALK': return <Ionicons name="walk" size={18} color="white" />;
      case "CABLE_CAR" : return <FontAwesome5 name="tram" size={18} color="white" />;
      default: return <Ionicons name="directions-transit" size={18} color="white" />;
    }
  };
  
  const getTransitColor = (mode) => {
    switch(mode) {
      case 'BUS': return '#0D47A1';
      case 'TRAM': return '#00695C';
      case 'SUBWAY': return '#880E4F';
      case 'RAIL': return '#3E2723';
      default: return '#4285F4';
    }
  };

  const formatTime = (serviceDay, seconds) => {
    const date = new Date((serviceDay + seconds) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggle3DBuildings = () => {
    if (mapRef.current) {
      const newState = !show3DBuildings;
      setShow3DBuildings(newState);
      
      mapRef.current.animateCamera({
        pitch: newState ? 45 : 0,
      }, 500);
    }
  };

  useEffect(() => {
    const fetchWeatherAndPollution = async () => {
      if (region) {
        setLoading(true);
        try {
          const weather = await getWeather(region.latitude, region.longitude);
          const pollution = await getAirPollution(region.latitude, region.longitude);
          
          setWeatherData(weather);
          setPollutionData(pollution);
        } catch (error) {
          console.error('Error fetching weather or pollution data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchWeatherAndPollution();
  }, [region.latitude, region.longitude]);

  const getWeatherIcon = (weatherCode) => {
    if (!weatherCode) return 'weather-partly-cloudy';
    
    if (weatherCode >= 200 && weatherCode < 300) return 'weather-lightning';
    if (weatherCode >= 300 && weatherCode < 400) return 'weather-pouring';
    if (weatherCode >= 500 && weatherCode < 600) return 'weather-rainy';
    if (weatherCode >= 600 && weatherCode < 700) return 'weather-snowy';
    if (weatherCode >= 700 && weatherCode < 800) return 'weather-fog';
    if (weatherCode === 800) return 'weather-sunny';
    if (weatherCode > 800) return 'weather-partly-cloudy';
    
    return 'weather-partly-cloudy';
  };

  const getAirQualityColor = (aqi) => {
    if (!aqi && aqi !== 0) return '#999'; 
    
    switch (aqi) {
      case 1: return '#4CAF50'; // Good - Green
      case 2: return '#8BC34A'; // Fair - Light Green
      case 3: return '#FFC107'; // Moderate - Yellow
      case 4: return '#FF9800'; // Poor - Orange
      case 5: return '#F44336'; // Very Poor - Red
      default: return '#999';   // Unknown - Gray
    }
  };

  const getAirQualityText = (aqi) => {
    if (!aqi && aqi !== 0) return 'Inconnu';
    
    switch (aqi) {
      case 1: return 'Bonne';
      case 2: return 'Correcte';
      case 3: return 'Moyenne';
      case 4: return 'Mauvaise';
      case 5: return 'Très mauvaise';
      default: return 'Inconnu';
    }
  };

  return (
    <>
      <View style={[styles.filterContainer, { top: 10 + insets.top }]}>
        <TouchableOpacity 
          style={[styles.filterButton, showFountains && styles.filterButtonActive]} 
          onPress={() => setShowFountains(!showFountains)}
        >
          <MaterialCommunityIcons 
            name="fountain" 
            size={20} 
            color={showFountains ? "white" : "#0D47A1"} 
          />
          <Text style={[styles.filterText, showFountains && styles.filterTextActive]}>
            Fontaines
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, showToilets && styles.filterButtonActive]} 
          onPress={() => setShowToilets(!showToilets)}
        >
          <MaterialCommunityIcons 
            name="toilet" 
            size={20} 
            color={showToilets ? "white" : "#0D47A1"} 
          />
          <Text style={[styles.filterText, showToilets && styles.filterTextActive]}>
            Toilettes
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, showMuseums && styles.filterButtonActive]} 
          onPress={() => setShowMuseums(!showMuseums)}
        >
          <MaterialIcons 
            name="museum" 
            size={20} 
            color={showMuseums ? "white" : "#0D47A1"} 
          />
          <Text style={[styles.filterText, showMuseums && styles.filterTextActive]}>
            Musées
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.weatherContainer, { top: 70 + insets.top }]}>
        {loading && false ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <>
            {weatherData && (
              <TouchableOpacity         activeOpacity={1}
              style={styles.weatherButton}>
                
                <MaterialCommunityIcons 
                  name={getWeatherIcon(weatherData.weather?.[0]?.id)} 
                  size={20} 
                  color="#0D47A1" 
                />
                <Text style={styles.weatherText}>
                  {Math.round(weatherData.main?.temp)}°C
                </Text>
              </TouchableOpacity>
            )}
            
            {pollutionData && pollutionData.list && pollutionData.list[0] && (
              <TouchableOpacity 
              activeOpacity={1}

                style={[
                  styles.airQualityButton, 
                  { backgroundColor: getAirQualityColor(pollutionData.list[0].main.aqi) }
                ]}
              >
                <MaterialIcons name="air" size={15} color="white" />
                <Text style={styles.airQualityText}>
                  {getAirQualityText(pollutionData.list[0].main.aqi)}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

    <View style={[styles.rightButtonContainer, { right: 10 + insets.right }]}>
        <TouchableOpacity 
          style={[styles.filterButton, show3DBuildings && styles.filterButtonActive]} 
          onPress={toggle3DBuildings}
        >
     
          <Text style={[styles.filterText, show3DBuildings && styles.filterTextActive,{fontSize: 14, fontWeight: '900',alignSelf: 'center'}]}>
            3D
          </Text>
        </TouchableOpacity>
      </View>
      </View>

      

      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsCompass={true}
        showsBuildings={true}
        showsTraffic={true}
        showsUserLocation={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#4285F4"
            strokeWidth={4}
          />
        )}
        
        {showFountains && routesData.drinking_water.map((fountain, index) => (
          <Marker
            key={`fountain-${fountain.id}`}
            coordinate={{
              latitude: fountain.lat,
              longitude: fountain.lon
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.fountainMarker}>
              <MaterialCommunityIcons name="fountain" size={18} color="white" />
            </View>
            <Callout>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>Fontaine</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {showToilets && routesData.toilettes.map((toilet, index) => (
          <Marker
            key={`toilet-${toilet.id}`}
            coordinate={{
              latitude: toilet.lat,
              longitude: toilet.lon
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.toiletMarker}>
              <MaterialCommunityIcons name="toilet" size={18} color="white" />
            </View>
            <Callout>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>Toilettes publiques</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {showMuseums && routesData.musée.map((museum, index) => (
          <Marker
            key={`museum-${museum.id}`}
            coordinate={{
              latitude: museum.lat,
              longitude: museum.lon
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.museumMarker}>
              <MaterialIcons name="museum" size={18} color="white" />
            </View>
            <Callout>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>Musée</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        
        {startCoords && (
          <Marker
            coordinate={{
              latitude: parseFloat(startCoords.lat),
              longitude: parseFloat(startCoords.lon)
            }}
          >
            <View style={{backgroundColor: 'white', padding: 5, borderRadius: 40}}>
              <Ionicons name="location" size={27} color="black" />
            </View>
          </Marker>
        )}
        
        {transitPoints.map((point, index) => (
          <Marker
            key={`transit-${index}`}
            coordinate={point.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.transitPoint, { backgroundColor: point.color ? point.color : getTransitColor(point.mode) }]}>
              {getTransitIcon(point.mode)}
              {point.route ? (
                <Text style={styles.routeText}>{point.route}</Text>
              ) : null}
            </View>
            <Callout tooltip>
              <View style={styles.calloutView}>
                <Text style={styles.calloutTitle}>
                  {point.mode === 'BUS' ? 'Bus' : point.mode === 'TRAM' ? 'Tram' : 'Transport'} {point.route}
                </Text>
                {point.stopName ? (
                  <Text style={styles.calloutText}>Arrêt: {point.stopName}</Text>
                ) : null}
                {point.agencyName ? (
                  <Text style={styles.calloutText}>{point.agencyName}</Text>
                ) : null}
                
                {(point.mode === 'BUS' || point.mode === 'TRAM') && (
                  <View style={styles.realTimeContainer}>
                    <Text style={styles.realTimeTitle}>Prochains départs:</Text>
                    
                    {!stopTimesData[index] ? (
                      <Text style={styles.calloutText}>Pas de données disponibles</Text>
                    ) : stopTimesData[index].length > 0 && stopTimesData[index][0].times ? (
                      stopTimesData[index][0].times.slice(0, 3).map((time, timeIndex) => (
                        <Text key={timeIndex} style={styles.timeText}>
                          {formatTime(time.serviceDay, time.realtimeDeparture)} 
                          {time.realtime ? ' (temps réel)' : ''}
                          {time.occupancyId && ` · ${time.occupancy}`}
                        </Text>
                      ))
                    ) : (
                      <Text style={styles.calloutText}>Aucun départ prévu</Text>
                    )}
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
        
        {endCoords && (
          <Marker
            coordinate={{
              latitude: parseFloat(endCoords.lat),
              longitude: parseFloat(endCoords.lon)
            }}
            title="Arrivée"
          >
            <View style={{backgroundColor: 'white', padding: 10, borderRadius: 40}}>
              <FontAwesome5 name="flag-checkered" size={20} color="black" />
            </View>
          </Marker>
        )}
      </MapView>
    </>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  transitPoint: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
    flexDirection: 'row',
  },
  routeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 2,
  },
  calloutView: {
    width: 200,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 12,
  },
  realTimeContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  realTimeTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    marginVertical: 2,
  },
  filterContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 999,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  filterButtonActive: {
    backgroundColor: '#0D47A1',
  },
  filterText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#0D47A1',
  },
  filterTextActive: {
    color: 'white',
  },
  fountainMarker: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  toiletMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  museumMarker: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  rightButtonContainer: {
    position: 'relative',
   
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  weatherContainer: {
    position: 'absolute',
    right: 10,
    flexDirection: 'column',
    alignItems: 'flex-end',
    zIndex: 999,
  },
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  weatherText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  airQualityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  airQualityText: {
    marginLeft: 6,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default RouteMap;