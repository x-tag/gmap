(function(){
  
  var libraries = '';
  var loading = false;
  function createScript(){
    loading = true;
    var params = '';
    var meta = document.querySelector('meta[name="x-gmap-settings"]');
    if (meta) {
      if (meta.hasAttribute('key')) params += '&key=' + meta.getAttribute('key');
      if (meta.hasAttribute('version')) params += '&v=' + meta.getAttribute('version');
      if (meta.hasAttribute('libraries')) params += '&libraries=' + (libraries = meta.getAttribute('libraries'));
    }
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://maps.googleapis.com/maps/api/js?callback=HTMLXGmapElement.initializeMaps' + params;
    document.body.appendChild(script);
  };
  
  function initialize(node){
    var map = node.xtag.map = new maps.Map(node, {
      zoom: node.zoom,
      center: { lat: node.lat, lng: node.lng  },
      disableDefaultUI: !node.defaultUI
    });
    if (libraries.indexOf('places') > -1) {
      node.xtag.places = new maps.places.PlacesService(map);
      node.xtag.autocomplete = new maps.places.AutocompleteService();  
    }
    node.xtag.directions = {
      service: new maps.DirectionsService(),
      renderer: new maps.DirectionsRenderer()
    }
    node.xtag.directions.renderer.setMap(map);
  };
  
  HTMLXGmapElement = xtag.register('x-gmap', {
    lifecycle: {
      created: function() {
        if (!loaded && !loading) createScript();
        else initialize(this);
      }
    }, 
    events: { 
    
    },
    accessors: {
      defaultUI: {
        attribute: { name: 'default-ui', boolean: true }
      },
      lat: {
        attribute: {
          validate: function(coord){
            return 1 * coord || -36.974777
          }
        },
        get: function(){
          return this.getAttribute('lat') || 36.974777;
        }
      },
      lng: {
        attribute: {
          validate: function(coord){
            return 1 * coord || -122.024459
          }
        },
        get: function(){
          return this.getAttribute('lng') || -122.024459;
        }
      },
      zoom: {
        attribute: {
          validate: function(coord){
            return 1 * coord || 11;
          }
        },
        get: function(){
          return this.getAttribute('zoom') || 11;
        },
        set: function(num){
          if (this.xtag.map) this.xtag.map.setZoom(num);
        }
      }
    }, 
    methods: {
      getPredictions: function(obj){
        node.xtag.autocomplete.getQueryPredictions(obj, function(predictions, status) {
          if (status != maps.places.PlacesServiceStatus.OK) {
            console.error(status);
            obj.onError(status);
            return;
          }
          obj.onSuccess(predictions, status);
        });
      },
      getDetails: function(request, fn){
        request = request || {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4'
        };  
        node.xtag.places.getDetails(request, fn || function(place, status) {
          if (status == maps.places.PlacesServiceStatus.OK) {
            createMarker(place);
          }
        });
      },
      addMarker: function(coords, title){
        return new maps.Marker({
          position: new maps.LatLng(coords[0], coords[1]),
          map: this.xtag.map,
          title: title 
        });
      }
    }
  });
  
  var maps;
  var loaded = false;
  HTMLXGmapElement.initializeMaps = function(){
    maps = google.maps;
    xtag.query(document, 'x-gmap').forEach(initialize);
    loaded = true;
    loading = false;
    HTMLXGmapElement.ready = true;
    xtag.fireEvent(document, 'gmapready');
  }

})();
