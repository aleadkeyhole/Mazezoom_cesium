/* Key for bingmaps api*/
Cesium.BingMapsApi.defaultKey = 'AtzPOZBe-iIHEFJY2xCqo8sxLNzYTkVM6_rhNH8sD0qCr9CNZTLR5s7f17VwZvLH';

/*Renders the Cesium interface*/
var viewer = new Cesium.Viewer('cesiumContainer', {
    navigationHelpButton: false
});

/*
  @types :      Distinct types of the list data entities
  @startTime :  Minimal start date for the timeline on the Cesium view
  @stopTime :   Maximal end date for the timeline on the Cesium view
*/
var types = new Set();
var startTime = new Date(3000, 0, 0, 0, 0, 0, 0);
var stopTime = new Date(0, 0, 0, 0, 0, 0, 0);
var intervals = new Cesium.TimeIntervalCollection();
var stalledEntities = [];

/*Toggles the control panel in the Cesium view*/
$("#cb_toggle_display").change(function () {
    $("#menu").toggle("display");
});

/*Initialization of script on document load, executing the get request to the api. If sucessfull it passes the data to renderfunctions on the Cesium framework*/
$(document).ready(function () {
    $.ajax({
        url: "https://dev.stefanvlems.nl/mazezoom/dataset/feed.php",
        dataType: 'json',
        async: false,
        success: function (data) {
            init(data);
        }
    });
       geocodeAddress(geocoder, "Roermond");
    initConfig();
});

/*Initialization of configuration file, now only loads preset_locations*/
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
                    console.log("You've tried to add a config variable that hasn't been recognised");
                    break;
            }
        });
    });
}

/*Get long lat data from the google api based on a location name. Example:"Roggel"
  @geocoder : GeoCoder instance
  @value : Selected search term
  @viewer.camera.flyTo : Function : Set's te camera to the result of the searched term's location
*/
function geocodeAddress(geocoder, value) {
    geocoder.geocode({
        'address': value
    }, function (results, status) {
        if (status === 'OK') {
            let lat = results[0].geometry.location.lat();
            let long = results[0].geometry.location.lng();
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(long, lat, 15000.0)
            });
        } else {
            console.log('Geocode was not successful for the following reason: ' + status);
        }
    });
};

/*Calibrates the timeline values, checking for the minimal start and end time if present on the object i
  @i : Single entity Json object
*/
function calibrateTimeline(i) {
    let context = this;
    let entityStartTime = i.location.start;
    let entityEndTime = i.location.end;
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

/*After calibration for each item the timeline is initializes, set to focus on the start point of the two date ranges*/
function initializeTimeline() {
    let startTime = new Cesium.JulianDate.fromDate(this.startTime);
    let stopTime = new Cesium.JulianDate.fromDate(this.stopTime);
    viewer.clock.startTime = startTime;
    viewer.clock.shouldAnimate = true;
    viewer.clock.stopTime = stopTime;
    viewer.clock.currentTime = startTime;
    viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
    viewer.timeline.updateFromClock();
    viewer.timeline.zoomTo(startTime, stopTime);
    window.setInterval(function () {
        updateTimeMeta();
    }, 1000);
}

/* Adds a julian function to the Date prototype */
Date.prototype.getJulian = function () {
    return Math.floor((this / 86400000) - (this.getTimezoneOffset() / 1440) + 2440587.5);
}



/*
    Updates the globe to match the selected time
*/
function updateTimeMeta() {
    let currentTime = viewer.clock.currentTime; 
    var context = this;
    for (var i = 0; i < viewer.entities._entities.length; i++) {
        let entity = viewer.entities._entities._array[i];
        let interval = viewer.entities._entities._array[i].interval;
        console.log(interval)
        if (Cesium.TimeInterval.contains(interval, currentTime)) {
            console.log("timeinterval present : ", interval);
            if(entity._show !== true){
                entity._show = true;
            }
        } else {
            console.log("Curtime not within timeinterval");
            if(entity._show != false){
                entity._show = false;
            }
            
        }
    }
}

/*Creates a time interval based on the entity's start and end time and returns it
    @i: Entity to construct the interval  
    @timeInterval the constructed timeInterval, note the object's properties
 */
function createInterval(i) {
    let intervalStartTime = new Date(i.location.start, 0, 0, 0, 0, 0, 0);
    intervalStartTime = intervalStartTime.toISOString();


    let intervalEndTime = new Date(i.location.end, 0, 0, 0, 0, 0, 0);
    intervalEndTime = intervalEndTime.toISOString();

    var timeInterval = new Cesium.TimeInterval({
        start: Cesium.JulianDate.fromIso8601(intervalStartTime),
        stop: Cesium.JulianDate.fromIso8601(intervalEndTime),
        isStartIncluded: true,
        isStopIncluded: true,
        data: null
    });
    return timeInterval;
}


/*Renders the result of the get request data onto the Cesium framework as marker items. Note: at the end of this function the timeline is initialized
  @data : List containing entity Json objects
*/
function renderMarkers(entity) {
    let context = this;
    let i = entity;
    viewer.entities.add({
        name: i.location.title,
        id: i.location.id,
        type: i.location.type,
        show: false,
        interval: context.createInterval(i),
        /*In the future we can add anything we want to the modal by adding properties to the description key*/
        description: "<h1>Type : " + i.location.type + "</h1><h1>Start : " + i.location.start + " End:  " + i.location.end +"</h1><p>" + "Description : " + i.location.description + "</p>",
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
}

/* Initialisation of the interface data */
function init(entityList) {
    for (var x = 0; x < entityList.length; x++) {
        let i = entityList[x];
        if (i.location.type !== undefined) {
            types.add(i.location.type);
        }
        calibrateTimeline(i);
        renderMarkers(i);
        renderFilter(types);
    }
    initializeTimeline();
}

/*Renders the filter preferences and adds the click event on each element, settinf the correct value to the dropdown button and filtering the list based on the event sender
  @list list of each filter. Example : 'Building'
*/
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

/*Loads json from a given filepath and esecutes a callback when it's finished
  @filepath : String containing the file location
  @callback : callback function executed on sucess
*/
function loadJSON(filepath, callback) {
    $.getJSON(filepath, function (data) {
        callback(data);
    })
};

/*Filters the entities array of the viewer.entities array, setting non matching entities to hidden based on it's type
  @filterType : String param of filter value. Example : 'Building'
  @viewer : Cesium viewer instance containing the entities rendered on the Cesium container   
*/
function filterList(filterType, viewer) {
    for (var i = 0; i < viewer.entities._entities._array.length; i++) {
        if (filterType.indexOf(viewer.entities._entities._array[i]._type) <= -1) {
            viewer.entities._entities._array[i]._show = false;
        } else {
            viewer.entities._entities._array[i]._show = true;
        }
    }
}