const axios = require('axios')
var fs = require('fs');
const process = require('process');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const API_KEY="AIzaSyAFjmwW7a9Z_MnjMtn4lcGwJsJgiiUZ66k"
const deviceId=process.argv[2];
const filename = "/mnt/NAS/Airspace/NodeScript/database.sqlite3"

const cron = require('node-cron');

// Schedule task to run every minute
cron.schedule("* * * * *", function() {
  /// Make request
  axios.get(`https://track.shiprec.io/api/packages/track?token=${deviceId}&interval_hours=${process.argv[3]}`)
  
  // Show response data
  .then(async res => {
    let response = res.data 
    const db = await open({
      filename,
      driver: sqlite3.Database
    });
  
    await db.exec('CREATE TABLE IF NOT EXISTS tracking (timestamp INTEGER NOT NULL, device_id INTEGER NOT NULL, latitude REAL, longitude REAL, PRIMARY KEY (timestamp, device_id))');
    response.forEach(async element => {
      await db.exec(`INSERT OR IGNORE INTO tracking VALUES (${element.timestamp}, "${deviceId}", ${element.lat}, ${element.long})`)
    });
  
    const result = await db.all('SELECT * FROM tracking WHERE device_id=? ORDER BY timestamp DESC', deviceId);
  
      var fileName = `track_${process.argv[2]}.html`;
      var stream = fs.createWriteStream(fileName);
  
      stream.once('open', function() {
      var html = buildHtml(result, API_KEY);
  
      stream.end(html);
    });
  console.log("Script ran")
  
  })
  .catch(err => console.log(err))
  
 function buildHtml(dataPoints, apiKey) {
  
    return `<!DOCTYPE html>
    <html>
      <head>
          <title>Google Maps API</title>
          <script>
              var dataPoints = ${JSON.stringify(dataPoints)};
              function initMap() {
                  var map = new google.maps.Map(document.getElementById('map'), {
                  center: {lat: dataPoints[0]['latitude'], lng: dataPoints[0]['longitude']},
                   zoom: 800
              });
              dataPoints.forEach((data, index) => {
                var date = new Date(data['timestamp'] * 1000);
                var formattedTime = date.toLocaleString('en-US', {timeZoneName: 'short'})
                var marker;
                
                if(index === 0) {
                  console.log('first')
                  marker = new google.maps.Marker({
                      position: { lat: data['latitude'], lng: data['longitude'] },
                      map: map,
                      title: formattedTime,
                      zIndex:99999999,
                      icon: {
                          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                      }
                  });
                } else {
                  marker = new google.maps.Marker({
                      position: { lat: data['latitude'], lng: data['longitude'] },
                      map: map,
                      title: formattedTime,
                      icon: {
                          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                      }
                  });
                }
            
              })
            }
          </script>
      </head>
      <body onload='initMap()'>
          <div id='map' style='height: 1080px; width: 100%;'></div>
          <script src='https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap'></script>
      </body>
    </html>`;
  };
});
  

