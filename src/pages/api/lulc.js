import key from './_key.json';

export default async function handler(req, res) {

  var ee = require('@google/earthengine');
  var generateMap = () => {

    var lulc = ee.ImageCollection('projects/sat-io/open-datasets/landcover/ESRI_Global-LULC_10m_TS');


    var dict = {
      "names": [
        "Water",
        "Trees",
        "Flooded Vegetation",
        "Crops",
        "Built Area",
        "Bare Ground",
        "Snow/Ice",
        "Clouds",
        "Rangeland"
      ],
      
      "colors": [
        "#1A5BAB",
        "#358221",
        "#87D19E",
        "#FFDB5C",
        "#ED022A",
        "#EDE9E4",
        "#F2FAFF",
        "#C8C8C8",
        "#C6AD8D"
      ]
    };


    function remapper(image) {
      var remapped = image.remap([1, 2, 4, 5, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7, 8, 9])
      return remapped
    }

    // This is palette has '#000000' for value 3 and 6.
    var palette = [
      "#1A5BAB",
      "#358221",
      "#000000",
      "#87D19E",
      "#FFDB5C",
      "#000000",
      "#ED022A",
      "#EDE9E4",
      "#F2FAFF",
      "#C8C8C8",
      "#C6AD8D",
    ];


    var roi = ee.Geometry.Polygon(
      [[
        [127.94248139921513, 5.33459854167601],
        [126.74931782819613, 11.825234466620996],
        [124.51107186428203, 17.961503806746318],
        [121.42999903167879, 19.993626604011016],
        [118.25656974884657, 18.2117821750514],
        [116.27168958893185, 6.817365082528201],
        [122.50121143769957, 3.79887124351577],
        [127.94248139921513, 5.33459854167601]
      ]], null, false);


    // Define a time range
    var startDate = '2017-01-01';
    var endDate = '2017-12-31';

    // Filter the image collection based on the ROI and time range
    var filteredCollection = ee.ImageCollection(lulc.filterDate(startDate,endDate).filterBounds(roi).mosaic()).map(remapper).toBands();

    var clippedImage = filteredCollection.clip(roi);

    // Get the median NDVI image

    // Define visualization parameters
    var visParams = {
      min: 1,
      max: 9,
      palette: dict.colors
    };

    var mapUrl = clippedImage.getMap(visParams);
    res.statusCode = 200;
    res.end(JSON.stringify(mapUrl));


  }


  ee.data.authenticateViaPrivateKey(key, generateMap, function (error) {
    console.error('Error authenticating with Earth Engine: ' + error);
    res.status(500).send('Internal Server Error');
  });

}