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
      polylines: [],
      infowindows: [],
      overlayviews: []
    };
    var map = node.xtag.map = new maps.Map(node, {
      zoom: node.zoom,
      center: node.center,
      disableDefaultUI: !node.defaultUI,
    });
    map.addListener('idle', function(){
      var center = map.getCenter();
      node.center = center.lat() + ',' + center.lng();
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

  var coordSplit = /\s*,\s*/;

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
      center: {
        attribute: {
          def: '36.974777, -122.024459'
        },
        get: function(){
          return this.xtag.centerObj;
        },
        set: function(val){
          var split = val.split(coordSplit);
          var centerString = split.join();
          if (centerString != this.xtag.centerString) {
            this.xtag.centerString = centerString;
            this.xtag.centerObj = {
              lat: Number(split[0]),
              lng: Number(split[1])
            };
            if (this.xtag.ready) this.xtag.map.setCenter(this.xtag.centerObj);
          }
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
      clearOverlays: function(){
        var overlays = this.xtag.overlays;
        for (var z in overlays) overlays[z].slice(0).forEach(function(overlay){
          overlay.setMap(null);
        });
      },
      getPlaces: function(obj){
        this.xtag.places.textSearch(obj, function(response, status) {
          if (status != maps.places.PlacesServiceStatus.OK) {
            console.error(status);
            if (obj.onError) obj.onError(response, status);
          }
          else if (obj.onSuccess) obj.onSuccess(response, status);
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

  function removeOverlay(type, item){
    var items = item._node.xtag.overlays[type];
    items.splice(items.indexOf(item), 1);
  }

  HTMLXGmapElement.initializeMaps = function(){
    xtag.fireEvent(document, 'gmapsapiloaded');
    maps = google.maps;
    ['OverlayView', 'Marker', 'Polyline', 'InfoWindow'].forEach(function(klass){
      var type = klass.toLowerCase() + 's';
      var proto = maps[klass].prototype;
      var name = proto.open ? 'open' : 'setMap';
      var method = proto[name];
      proto[name] = function(map){
        if (map && map._node && !~map._node.xtag.overlays[type].indexOf(this)) {
          if (this._node) removeOverlay(type, this);
          this._node = map._node;
          map._node.xtag.overlays[type].push(this);
        }
        else if (!map && this._node) removeOverlay(type, this);
        return method.apply(this, arguments);
      };
    });
    xtag.query(document, 'x-gmap').forEach(initialize);
    loaded = true;
    loading = false;
    HTMLXGmapElement.ready = true;
    xtag.fireEvent(document, 'gmapsready');
  }

})();

(function(){

  xtag.mixins.input = {
    lifecycle: {
      created: function(){
        if (!this.xtag.input) this.xtag.input = this.querySelector('input');
      }
    },
    methods: {
      isValid: function(){
        return this.xtag.validationRegex ? this.xtag.validationRegex.test(this.value) : true;
      }
    },
    accessors: {
      name: {
        attribute: { property: 'input' }
      },
      disabled: {
        attribute: { boolean: true, property: 'input' }
      },
      value: {
        get: function(){
          return this.xtag.input.value;
        },
        set: function(value){
          this.xtag.input.value = value;
        }
      },
      validate: {
        attribute: {},
        set: function(value){
          this.xtag.validationRegex = new RegExp(value);
        }
      }
    }
  };

})();
