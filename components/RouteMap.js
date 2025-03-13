import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

const RouteMap = ({ region, routeCoordinates, startCoords, endCoords, transitPoints = [], onRegionChangeComplete }) => {
  // Get icon for transit mode
  const getTransitIcon = (mode) => {
    switch(mode) {
      case 'BUS': return <FontAwesome5 name="bus" size={18} color="white" />;
      case 'TRAM': return <MaterialIcons name="tram" size={18} color="white" />;
      case 'SUBWAY': return <FontAwesome5 name="subway" size={18} color="white" />;
      case 'RAIL': return <MaterialIcons name="train" size={18} color="white" />;
      case 'WALK': return <Ionicons name="walk" size={18} color="white" />;
      default: return <Ionicons name="directions-transit" size={18} color="white" />;
      
    }
  };
  
  // Get color for transit mode
  const getTransitColor = (mode) => {
    switch(mode) {
      case 'BUS': return '#0D47A1';
      case 'TRAM': return '#00695C';
      case 'SUBWAY': return '#880E4F';
      case 'RAIL': return '#3E2723';
      default: return '#4285F4';
    }
  };

  return (
    <MapView
      style={styles.map}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {/* Draw the route if available */}
      {routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#4285F4"
          strokeWidth={4}
        />
      )}
      
      {/* Start marker */}
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
      
      {/* Transit points */}
      {transitPoints.map((point, index) => (
        <Marker
          key={`transit-${index}`}
          coordinate={point.coordinate}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.transitPoint, { backgroundColor: point.color ? point.color : getTransitColor(point.mode) }]}>
           
            {getTransitIcon(point.mode)}
            {/* <FontAwesome5 name={getTransitIcon(point.mode)} size={18} color="white" /> */}
            {point.route ? (
              <Text style={styles.routeText}>{point.route}</Text>
            ) : null}
          </View>
          <Callout tooltip visible >
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
            </View>
          </Callout>
        </Marker>
      ))}
      
      {/* End marker */}
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
    width: 150,
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
  }
});

export default RouteMap;