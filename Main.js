//Renders the Cesium interface on the div with the id cesiumContainer 
var viewer = new Cesium.Viewer('cesiumContainer', {
  animation: false,
  navigationHelpButton: false
});

var entities = new Set();
var types = new Set();
var startTime = new Date(3000, 0, 0, 0, 0, 0, 0);
var stopTime = new Date(0, 0, 0, 0, 0, 0, 0);
var viewerEntities = [];

$("#cb_toggle_display").change(function () {
  $("#menu").toggle("display");
});

//Initialisation of script on document load
$(document).ready(function () {
  console.log("Document ready");
  $.ajax({
    url: "https://dev.stefanvlems.nl/mazezoom/dataset/feed.php",
    dataType: 'json',
    async: false,
    success: function (data) {
      renderMarkers(data);
      renderFilter(types);

    }
  });
  initConfig();
  console.log("Entities initialized : ", entities);
  console.log("Types initialized: ", types);
});


function initConfig() {
  loadJSON('config.json', function (data) {
    $.each(data, function (key, value) {
      switch (key) {
        case 'presets_locations':
          for (var i = 0; i < data[key].length; i++) {
            $("#presets_locations").append('<li class="location_preset"><a>' + value[i] + '</a></li>');
          }
          (function () {
            $(".location_preset").click((function (e) {
              var adress = e.delegateTarget.innerText;
              var geocoder = new google.maps.Geocoder();
              geocodeAddress(geocoder, adress);
              $("#location_presets_toggle_button").html(adress + '<span class="caret" ></span>');
            }).bind(this));
          })();
          break;
        default:
          break;
      }
    });
  });
}

function geocodeAddress(geocoder, value) {
  geocoder.geocode({
    'address': value
  }, function (results, status) {
    if (status === 'OK') {
      console.log(results[0].types[0]);
      var type = results[0].types[0];
      var lat = results[0].geometry.location.lat();
      var long = results[0].geometry.location.lng();
      console.log("Latitude :" + lat + " " + "Longitude : " + long);
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(long, lat, 15000.0)
      });
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
};

function calibrateTimeline(i) {
  var context = this;
  var entityStartTime = i.location.start;
  var entityEndTime = i.location.end;
  if (entityStartTime !== null) {
    entityStartTime = new Date(entityStartTime, 0, 0, 0, 0, 0, 0);
    if (entityStartTime < context.startTime) {
      context.startTime = entityStartTime;
    }
  }
  if (entityEndTime !== null) {
    entityEndTime = new Date(entityEndTime, 0, 0, 0, 0, 0, 0);
    if (entityEndTime > context.stopTime) {
      context.stopTime = entityEndTime;
    }
  }
}

function initializeTimeline() {
  let startTime = new Cesium.JulianDate.fromDate(this.startTime);
  let stopTime = new Cesium.JulianDate.fromDate(this.stopTime);
  viewer.clock.startTime = startTime;
  viewer.clock.stopTime = stopTime;
  viewer.clock.currentTime = startTime;
  viewer.timeline.updateFromClock();
  viewer.timeline.zoomTo(startTime, stopTime);
}

function renderMarkers(data) {
  var context = this;
  for (var x = 0; x < data.length; x++) {
    var i = data[x];
    calibrateTimeline(i);
    if (!i in entities) {
      console.log("Adding Entitiy to entities : ", i);
      entities.add(i);
    }
    types.add(i.location.type);
    viewer.entities.add({
      name: i.location.title,
      id: i.location.id,
      type: i.location.type,
      description: "<h1>Type : " + i.location.type + "</h1><p>" + "Description : " + i.location.description + "</p>",
      position: Cesium.Cartesian3.fromDegrees(i.location.point[0].lon, i.location.point[0].lat),
      point: {
        pixelSize: 5,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      label: {
        text: i.location.title,
        font: '14pt monospace',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -9)
      }
    });
    ;
  }
  viewerEntities = viewer.entities._entities._array;
  initializeTimeline();
}

function renderFilter(list) {
  if (list.size != 0) {
    for (var v of list) {
      $("#dd_preferences").append('<li class="preference"><a>' + v + '</a></li>');
    }
  } else {
    console.log("list size 0");
  }

  $(".preference").click((function (e) {
    var filterType = e.delegateTarget.innerText;
    filterList(filterType, viewer);
    $("#preference_toggle_button").html(filterType + '<span class="caret" ></span>');
  }).bind(this));
}

function loadJSON(filepath, callback) {
  $.getJSON(filepath, function (data) {
    callback(data);
  })
};

function filterList(filterType, viewer) {
  console.log("FilterList called");
  console.log("FilterType : ", filterType);
  console.log("Entities : ", viewer.entities._entities._array);
  console.log("viewer.entities._entites._array.length", viewer.entities._entities._array.length);
  for (var i = 0; i < viewer.entities._entities._array.length; i++) {

    if (filterType.indexOf(viewer.entities._entities._array[i]._type) <= -1) {
      viewer.entities._entities._array[i]._show = false;
    } else {
      viewer.entities._entities._array[i]._show = true;
      console.log("Kept Entity of type : ", viewer.entities._entities._array[i]._type);
    }
  }
}

