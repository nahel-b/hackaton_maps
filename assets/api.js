const convertionLieu = async (searchQuery) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery + ", Grenoble, France"
        )}&format=json`
      );
  
      const data = await response.json();
      
      if (data.length > 0) {
       // console.log("Résultat :", data[0]); // Affiche le premier résultat
        
        return data[0]; // Renvoie le premier résultat (latitude & longitude)
      } else {
        console.log("Aucun résultat trouvé.");
        return null;
      }
  } catch (error) {
    console.error("Erreur lors de la requête :", error);
    return null;
  }
};


const itineraire = async (from, to, mode = 'WALK', wheelchair = false, walkSpeed = null, bikeSpeed = null) => {
  try {
    const fromCoords = `${from.lat},${from.lon}`;
    const toCoords = `${to.lat},${to.lon}`;
    
    // Construire l'URL de base
    let url = `https://data.mobilites-m.fr/api/routers/default/plan?fromPlace=${fromCoords}&toPlace=${toCoords}&mode=${mode}`;
    
    // Ajouter l'option wheelchair si nécessaire
    if (wheelchair) {
      url += '&wheelchair=true';
    }
    
    // Add walkSpeed if provided
    if (walkSpeed) {
      url += `&walkSpeed=${walkSpeed}`;
    }
    
    // Add bikeSpeed if provided
    if (bikeSpeed) {
      url += `&bikeSpeed=${bikeSpeed}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'itinéraire:", error);
    return null;
  }
};

export {convertionLieu, itineraire};
