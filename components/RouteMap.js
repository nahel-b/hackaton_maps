import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { getStopCodeByName } from '../utils/stopUtils';
import * as Location from 'expo-location';

const RouteMap = ({ 
  region, 
  routeCoordinates, 
  startCoords, 
  endCoords, 
  transitPoints = [], 
  stopTimesData = {}, 
  onRegionChangeComplete 
}) => {


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

  return (
    <MapView
      style={styles.map}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      // mapType='mutedStandard'
      showsCompass={true}
      showsBuildings={true}
      showsTraffic={true}
      showsUserLocation={true}
    >
      {routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#4285F4"
          strokeWidth={4}
        />
      )}
      
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
  }
});

export default RouteMap;