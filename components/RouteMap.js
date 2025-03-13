import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const RouteMap = ({ region, routeCoordinates, startCoords, endCoords, onRegionChangeComplete }) => {
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
          //title="Départ"
        >
            <View style={{backgroundColor: 'white', padding: 5, borderRadius: 40}}>
          <Ionicons name="location" size={27} color="black" />
          </View>
        </Marker>
      )}
      
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
});

export default RouteMap;