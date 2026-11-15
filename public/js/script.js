import { getCurrentWeather } from "./weather.js";
import { renderShortcuts, shortcuts } from "./shortcuts.js";
import { updateClock, getDate } from "./clock.js";

/*weatherJs.find({search: 'San Francisco, CA', degreeType: 'F'}, function(err, result) {
  if(err) console.log(err);
 
  console.log(JSON.stringify(result, null, 2));
});*/

//getLocation();
getCurrentWeather( 53.5461, -113.4938);

getDate();
updateClock();

renderShortcuts();