const axios = require('axios')
var fs = require('fs');
const process = require('process');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const API_KEY="AIzaSyAFjmwW7a9Z_MnjMtn4lcGwJsJgiiUZ66k"
const filename = "/mnt/NAS/Airspace/NodeScript/database.sqlite3"

const cron = require('node-cron');
const [first, second, interval, ...deviceIds] = process.argv;

// Schedule task to run every 5 minute
cron.schedule("*/5 * * * *", function() {
  deviceIds.forEach(deviceId => {
    try {
      /// Make request
    axios.get(`https://track.shiprec.io/api/packages/track?token=${deviceId}&interval_hours=${interval}`)
    
    // Show response data
    .then(async res => {
      let response = res.data 
      const db = await open({
        filename,
        driver: sqlite3.Database
      });
    
      await db.exec('CREATE TABLE IF NOT EXISTS tracking (timestamp TEXT NOT NULL, device_id TEXT NOT NULL, latitude REAL, longitude REAL, PRIMARY KEY (timestamp, device_id))');
      response.forEach(async element => {
        await db.exec(`INSERT OR IGNORE INTO tracking VALUES (${element.timestamp}, "${deviceId}", ${element.lat}, ${element.long})`)
      });
    
      const result = await db.all('SELECT * FROM tracking WHERE device_id=? ORDER BY timestamp DESC', deviceId);
    
        var fileName = `track_${deviceId}.html`;
        var stream = fs.createWriteStream(fileName);
    
        stream.once('open', function() {
        var html = buildHtml(result, API_KEY);
    
        stream.end(html);
        console.log("Updated correctly")
      });
    
      
    })
    .catch(err => console.log(err))
    } catch (error) {
      console.log("Not updated correctly")
    }
  })
  
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
                   zoom: 18
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
          <div id='map' style='height: 1200px; width: 100%;'></div>
          <script src='https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap'></script>
      </body>
    </html>`;
  };
});

  

