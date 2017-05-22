/* Key for bingmaps api*/
Cesium.BingMapsApi.defaultKey = 'AtzPOZBe-iIHEFJY2xCqo8sxLNzYTkVM6_rhNH8sD0qCr9CNZTLR5s7f17VwZvLH';

// var extent = Cesium.Rectangle.fromDegrees(9.0000,53.0000,9.0000,54.0001);

// Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;
// Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

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
var types_colors = new Set();
var startTime = new Date(3000, 0, 0, 0, 0, 0, 0);
var stopTime = new Date(0, 0, 0, 0, 0, 0, 0);
var stalledEntities = [];
var geocoder;
var prevTheme = "";

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
    geocoder = new google.maps.Geocoder();
    initConfig();
});

/* Initialisation of the interface data */
function init(entityList) {

    for (var x = 0; x < entityList.length; x++) {
        let i = entityList[x];
        calibrateTimeline(i);
        renderMarkers(i);
    }
    initializeTimeline();
    var resetType = "View all";
    types.add(resetType);
    renderFilter(types);
}


/*Initialization of configuration file, now only loads preset_locations*/
function initConfig() {
    initDaterangepicker();
    loadJSON('config.json', function (data) {
        $.each(data, function (key, value) {
            switch (key) {
                case 'presets_locations':
                    for (var i = 0; i < data[key].length; i++) {
                        $("#presets_locations").append('<li class="location_preset"><a>' + value[i] + '</a></li>');
                    }
                    (function () {
                        $(".location_preset").click((function (e) {
                            var address = e.delegateTarget.innerText;
                            geocodeAddress(geocoder, address, 15000.0);
                            $("#location_presets_toggle_button").html(address + '<span class="caret" ></span>');
                        }).bind(this));
                    })();
                    break;
                case 'themes':
                    $("#themeSelection").append('<label>Themes:</label>');
                    for (var i = 0; i < data[key].length; i++) {
                        $("#themeSelection").append(' <div class="radio"><label><input type="radio" class="radioIput" name="optradio" value="' + data[key][i] + '">' + data[key][i] + '</label></div>');
                    }
                    (function () {
                        $(".radioIput").click((function (e) {
                            var theme = e.delegateTarget.value;
                            changeTheme(theme);
                        }).bind(this));
                    })();
                    break;
                case 'default_view':
                    geocodeAddress(geocoder, data[key], 15000000.0);
                default:
                    console.log("You've tried to add a config variable that hasn't been recognised");
                    break;
            }
        });
    });
}

/*Adds a theme class to the buttons on the cesiumContianer div */
function changeButtons(theme) {
    var buttons = $("button");
    for (var i = 0; i < buttons.length; i++) {
        $(buttons[i]).removeClass(prevTheme);
        $(buttons[i]).addClass(theme);
    }
    prevTheme = theme;
}

/*Get long lat data from the google api based on a location name. Example:"Roggel"
  @geocoder : GeoCoder instance
  @value : Selected search term
  @viewer.camera.flyTo : Function : Set's te camera to the result of the searched term's location
*/
function geocodeAddress(geocoder, value, height) {
    geocoder.geocode({
        'address': value
    }, function (results, status) {
        if (status === 'OK') {
            let lat = results[0].geometry.location.lat();
            let long = results[0].geometry.location.lng();
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(long, lat, height)
            });
        } else {
            console.log('Geocode was not successful for the following reason: ' + status);
        }
    });
};

// Changes the theme based on the selected radiobutton
function changeTheme(theme) {
    $(".calendar-table").add("class", theme);
    $(".daterangepicker").add("class", theme);
    
    var daterangepickercss = document.getElementsByClassName("daterangepicker");
    console.log(daterangepickercss[0].className);
    $(daterangepickercss[0]).removeClass(prevTheme);
    $(daterangepickercss[0]).addClass(theme);
    var daterangepicker = document.getElementById("dateRange");
    daterangepicker.className = "";
    daterangepicker.className = theme;
    cesiumContainer = document.getElementById("cesiumContainer");
    cesiumContainer.className = "";
    cesiumContainer.className = theme;
    var panel = document.getElementById("controlPanel");
    panel.className = "";
    panel.className = theme;
    changeButtons(theme);
}


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
    }, 1800);
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
        if (entity._filtered === false) {
            let interval = viewer.entities._entities._array[i]._interval;
            if (Cesium.TimeInterval.contains(interval, currentTime)) {
                entity._show = true;
            } else {
                entity._show = false;
            }
        } else {
            entity._show = false;
        }
    }
}

//Get's the random color associated with each type on load
function getTypeRandomColor(type) {
    for (let [key, value] of types_colors.entries()) {
        if (type === value.type) {
            return value.color;
        }
        ;
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

function initDaterangepicker() {
    var datepicker = document.getElementById("dateRange");
    $(datepicker).daterangepicker({
        startDate: this.startTime,
        endDate: this.stopTime,
    });


    $(datepicker).on('apply.daterangepicker', function (ev, picker) {
        let startDate = new Date(picker.startDate.format('YYYY-MM-DD') + "Z");
        let endDate = new Date(picker.endDate.format('YYYY-MM-DD') + "Z");
        this.startTime = new Cesium.JulianDate.fromDate(startDate);
        this.stopTime = new Cesium.JulianDate.fromDate(endDate);
        viewer.clock.startTime = this.startTime;
        viewer.clock.shouldAnimate = true;
        viewer.clock.stopTime = this.stopTime;
        viewer.clock.currentTime = this.startTime;
        viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
        viewer.timeline.updateFromClock();
        viewer.timeline.zoomTo(this.startTime, this.stopTime);
        $(this).val(picker.startDate.format('MM/DD/YYYY') + ' - ' + picker.endDate.format('MM/DD/YYYY'));

    });
}

function toDate(dateStr) {
    const [name, month, day, year] = dateStr.split(" ")
    return new Date(year, month - 1, day)
}
/*Renders the result of the get request data onto the Cesium framework as marker items. Note: at the end of this function the timeline is initialized
  @data : List containing entity Json objects
*/
function renderMarkers(entity) {
    let context = this;
    var i = entity;
    var type = i.location.type;

    if (!types.has(type)) {
        let colorCode = {
            color: Cesium.Color.fromRandom(),
            type: type
        }
        types_colors.add(colorCode);
    }
    types.add(type);
    var entityColor = getTypeRandomColor(type);

    viewer.entities.add({
        name: i.location.title,
        id: i.location.id,
        type: type,
        show: false,
        filtered: false,
        interval: context.createInterval(i),
        /*In the future we can add anything we want to the modal by adding properties to the description key*/
        description: "<h1 style='color: " + entityColor.toCssColorString() + "' >Type : " + i.location.type + "</h1><h1>Start : " + i.location.start + " End:  " + i.location.end + "</h1><p>" + "Description : " + i.location.description + "</p>",
        position: Cesium.Cartesian3.fromDegrees(i.location.point[0].lon, i.location.point[0].lat),
        point: {
            pixelSize: 5,
            color: getTypeRandomColor(i.location.type),
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
    if (filterType === "View all") {
        for (var i = 0; i < viewer.entities._entities._array.length; i++) {
            viewer.entities._entities._array[i]._filtered = false;
        }
    } else {
        for (var i = 0; i < viewer.entities._entities._array.length; i++) {
            if (filterType.indexOf(viewer.entities._entities._array[i]._type) <= -1) {
                viewer.entities._entities._array[i]._filtered = false;
            } else {
                viewer.entities._entities._array[i]._filtered = true;
            }
        }
    }
}