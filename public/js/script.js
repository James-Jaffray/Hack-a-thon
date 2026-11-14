import weatherJs from "weather-js";

weatherJs.find({search: 'San Francisco, CA', degreeType: 'F'}, function(err, result) {
  if(err) console.log(err);
 
  console.log(JSON.stringify(result, null, 2));
});

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