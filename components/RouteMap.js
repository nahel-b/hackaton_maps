import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

const RouteMap = ({ region, routeCoordinates, onRegionChangeComplete }) => {
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