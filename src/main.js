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
    node.xtag.overlays = {
      markers: [],
      polylines: []
    };
    var map = node.xtag.map = new maps.Map(node, {
      zoom: node.zoom,
      center: { lat: node.lat, lng: node.lng  },
      disableDefaultUI: !node.defaultUI,
    });
    map._node = node;
    if (libraries.indexOf('places') > -1) {
      node.xtag.places = new maps.places.PlacesService(map);
      node.xtag.autocomplete = new maps.places.AutocompleteService();
    }
    node.xtag.directions = {
      service: new maps.DirectionsService(),
      renderer: new maps.DirectionsRenderer({
        markerOptions: {
          icon: node.markerIcon || null
        }
      })
    };
    node.xtag.directions.renderer.setMap(map);
    node.xtag.ready = true;
    xtag.fireEvent(node, 'gmapready');
  };

  HTMLXGmapElement = xtag.register('x-gmap', {
    lifecycle: {
      created: function() {
        loaded ? initialize(this) : !loading ? createScript() : null;
      }
    },
    accessors: {
      defaultUI: {
        attribute: { name: 'default-ui', boolean: true }
      },
      markerIcon: {
        attribute: {}
      },
      polylineColor: {
        attribute: {}
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
      overlays: {
        get: function(){
          return this.xtag.overlays;
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
          if (node.xtag.ready) this.xtag.map.setZoom(num);
        }
      }
    },
    methods: {
      resize: function(){
        maps.event.trigger(this.xtag.map, 'resize');
      },
      getPlaces: function(obj){
        this.xtag.places.textSearch(obj, function(response, status) {
          if (status != maps.places.PlacesServiceStatus.OK) {
            console.error(status);
            if (obj.onError) obj.onError(response, status);
          }
          else {
            if (obj.onSuccess) obj.onSuccess(response, status);
          }
        });
      },
      getDetails: function(request, fn){
        request = request || {
          placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4'
        };
        this.xtag.places.getDetails(request, fn || function(place, status) {
          if (status == maps.places.PlacesServiceStatus.OK) {
            createMarker(place);
          }
        });
      },
      getDirections: function(obj){
        var node = this,
            firstPoint = obj.waypoints.shift(),
            request = {
              origin: firstPoint.location,
              destination: obj.waypoints.length ? obj.waypoints.pop().location : firstPoint.location,
              waypoints: obj.waypoints,
              optimizeWaypoints: !!obj.optimize,
              travelMode: google.maps.TravelMode[(obj.mode || 'DRIVING').toUpperCase()]
            }
        this.xtag.directions.service.route(request, function(response, status) {
          if (status != maps.DirectionsStatus.OK) {
            console.error(status);
            if (obj.onError) obj.onError(response, status);
          }
          else {
            if (obj.onSuccess) obj.onSuccess(response, status);
            if (obj.display) {
              node.xtag.directions.renderer.setDirections(response);
            }
          }
        });
      }
    }
  });

  var maps;
  var loaded = false;

  function removeOverlay(method, item){
    var items = item._node.xtag.overlays[method];
    items.splice(items.indexOf(item), 1);
  }

  HTMLXGmapElement.initializeMaps = function(){
    xtag.fireEvent(document, 'gmapsapiloaded');
    maps = google.maps;
    ['Marker', 'Polyline'].forEach(function(method){
      var _method = method.toLowerCase() + 's';
      var setMap = maps[method].prototype.setMap;
      maps[method].prototype.setMap = function(map){
        if (map && map._node && !~map._node.xtag.overlays[_method].indexOf(this)) {
          if (this._node) removeOverlay(_method, this);
          this._node = map._node;
          map._node.xtag.overlays[_method].push(this);
        }
        else if (!map && this._node) removeOverlay(_method, this);
        return setMap.apply(this, arguments);
      };
    });
    xtag.query(document, 'x-gmap').forEach(initialize);
    loaded = true;
    loading = false;
    HTMLXGmapElement.ready = true;
    xtag.fireEvent(document, 'gmapsready');
  }

})();
