/*weatherJs.find({search: 'San Francisco, CA', degreeType: 'F'}, function(err, result) {
  if(err) console.log(err);
 
  console.log(JSON.stringify(result, null, 2));
});*/

//getLocation();
console.log("hello");
async function getWeather(latitude, longitude) {
  const url = `https://open-meteo.com${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log(data.current);
  } catch (error) {
    console.error("Error fetching weather:", error);
  }
}

getWeather(53.5461, -113.4938);

const shortcutCont = document.getElementById('shortcut-container');

function createShortcuts() {
    let container = document.createElement('div');
    container.classList.add('shortcut');
    
    let link = document.createElement('a');
    link.href = "";
    let image = document.createElement('img');
    image.src = "";
    image.alt = "shortcut image";
    link.append(image);

    let name = document.createElement('p');

    container.append(link, name);

    shortcutCont.append(container);
}