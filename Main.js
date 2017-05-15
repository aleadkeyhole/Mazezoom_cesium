var viewer = new Cesium.Viewer('cesiumContainer');


var entities = [];

function renderMarkers(data) {
  for (var i = 0; i < data.length; i++) {
    data.filter(function (i, n) {
      entities.push(i);
      viewer.entities.add({
        name: i.location.title,
        id: i.location.id,
        description: "<h1>Type : " +  i.location.type +  "</h1><p>"  + "Description : " +  i.location.description + "</p>",
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
    });
  }
}

$.getJSON("https://dev.stefanvlems.nl/mazezoom/dataset/feed.php", function (data) {
  // console.log("data : ", data);
  renderMarkers(data);
});



//Handle The click event of the map
var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(function (click) {
  var pickedObject = viewer.scene.pick(click.position);
  if (Cesium.defined(pickedObject)) {
    var entityId = pickedObject.id._id;
    console.log("comparing entityId : ", entityId);
    console.log("Logging entities : ", entities);
    if (containsObject(entityId, entities)) {
      console.log("Found marker!");
    }
    // var oldColor = buildingMap.get(entityId).polygon.material.color;
    // buildingMap.get(entityId).polygon.material.color = pickColor;
    // selectedEntity.set(entityId, oldColor);

    // var currentLayer = viewer.scene.imageryLayers.get(1);
    // if (typeof currentLayer !== 'undefined') {
    //     var info = currentLayer._imageryProvider._tileProvider.getTileCredits(click.position.x, click.position.y, 0);
    // }
    // console.log(pickedObject);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// Sandcastle.addToggleButton('Fog', scene.fog.enabled, function(checked) {
//     scene.fog.enabled = checked;
// });


// viewer.zoomTo(wyoming);

// function addDescription(element) {
//   element.location.description = '\ <img\   width="50%"\   style="float:left; margin: 0 1em 1em 0;"\   src="//cesiumjs.org/images/2015/02-02/Flag_of_Wyoming.svg"/>\ <p>\   Wyoming is a state in the mountain region of the Western \   United States.\ </p>\ <p>\   Wyoming is the 10th most extensive, but the least populous \  and the second least densely populated of the 50 United \   States. The western two thirds of the state is covered mostly \   with the mountain ranges and rangelands in the foothills of \  the eastern Rocky Mountains, while the eastern third of the \   state is high elevation prairie known as the High Plains. \   Cheyenne is the capital and the most populous city in Wyoming, \   with a population estimate of 62,448 in 2013.\ </p>\ <p>\   Source: \   <a style="color: WHITE"\    target="_blank"\    href="http://en.wikipedia.org/wiki/Wyoming">Wikpedia</a>\ </p>'; 
// }


function containsObject(obj, list) {
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i].location.id === obj) {
      return true;
    }
  }
  return false;
}