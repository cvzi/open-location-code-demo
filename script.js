var colors = {
red : "#fcc",
green : "#baf0ba",
yellow : "#ffa"
};

var map;
var iv;
var layers = [];


function main() {
  map = L.map('mapid').setView([49.41, -8.71], 11);
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 18,
      id: 'mapbox.streets',
      accessToken: access_token
  }).addTo(map);
  document.getElementById("location").addEventListener("change", findCode);
  document.getElementById("btn_find").addEventListener("click", findCode);
  document.getElementById("btn_startani").addEventListener("click", animate);
  document.getElementById("btn_step").addEventListener("click", step);
  document.getElementById("olcode").addEventListener("keyup", showCodeOnMap);
  document.getElementById("btn_stopani").addEventListener("click", function() {
    stopanimate();
  });
  document.getElementById("btn_clear").addEventListener("click", function() {
    stopanimate();
    document.getElementById("location").value = "";
    document.getElementById("olcode").value = "";
    clearMap();
  });
}

function findCode() {
  // Button handler
  if(document.getElementById("location").value) {
    calcCode();
  }
}

function showCodeOnMap() {
  // Button handler
  if(document.getElementById("olcode").value) {
    showRectangle();
  }
}



function showRectangle() {
  // Show the rectangle of the current plus code
  var olc = document.getElementById("olcode").value;
  var l = olc.length > 11 ? 11 : olc.length;
  var lat = OpenLocationCode.getAlphabet().indexOf(olc.charAt(0).toUpperCase()) * OpenLocationCode.getAlphabet().length;
  var lng = OpenLocationCode.getAlphabet().indexOf(olc.charAt(1).toUpperCase()) * OpenLocationCode.getAlphabet().length;
  var red = hex(l * 20);
  var green = hex(30);
  var blue = hex(255 * lat*lng / (499*499));
  var opacity = l / 11.1;
  
  var fullolc = paddCode(olc);
  try {
    var codeArea = OpenLocationCode.decode(fullolc);
    document.getElementById("olcode").title = "Full code: " + paddCode(olc);
  } catch(e) {
    if (e) {
     print(e+"\nWithout padding: "+olc);
     highlight(document.getElementById("olcode"), colors.red);
     return;
    }
  }
  var bounds = [[codeArea.latitudeLo, codeArea.longitudeLo], [codeArea.latitudeHi, codeArea.longitudeHi]];
  map.fitBounds(bounds);
  var rect = L.rectangle(bounds, {color: "#"+red+green+blue, weight: 1, opacity:opacity}).addTo(map);
  layers.push(rect);
}

function clearMap() {
  // Reset map drawing
  for(let i = 0; i < layers.length; i++) {
    layers[i].remove();
  }
}

function calcCode(ev, length, coords, name, foundcb) {
  // Calculate plus code from coordinates or geocode service result
  if(!length) {
    length = OpenLocationCode.CODE_PRECISION_EXTRA;
  }
  var query = document.getElementById("location").value;
  if(!coords) {
    try {
      var coords = query.match(/[-+]?(\d+\.\d+)\s*,\s*[-+]?(\d+.\d+)/).slice(1).map(s => parseFloat(s));
    } catch(e) {
      if(ev !== -1) {
        geocode(query, function(coords, name) {
          calcCode(-1, length, coords, name, foundcb);
          print("Found: " + name + "\n -> "+coords);
        });
      } else {
        print("Not found: " + query);
        highlight(document.getElementById("location"), colors.red);
      }
      return;
    }
  }
  var olc = OpenLocationCode.encode(coords[0], coords[1], length);
  document.getElementById("olcode").value = olc;
  document.getElementById("olcode").title = "Full code: " + paddCode(olc);
  highlight(document.getElementById("olcode"), colors.yellow);
  showRectangle(olc);
  if(foundcb) {
    foundcb(olc);
  }
}

function animate(ev, length, coords, name) {
  // Start animation
  stopanimate();
  backgroundColor(document.getElementById("btn_startani"));
  clearMap();
  
  if(!document.getElementById("location").value) {
    if(document.getElementById("olcode").value) {
      // Calculate location from code
      var olc = document.getElementById("olcode").value;
      var fullolc = paddCode(olc);
      try {
        var codeArea = OpenLocationCode.decode(fullolc);
        document.getElementById("location").value = codeArea.latitudeCenter + ", " + codeArea.longitudeCenter;
      } catch(e) {
        if (e) {
         print(e+"\nWithout padding: "+olc);
         highlight(document.getElementById("olcode"), colors.red);
         return;
        }
      }
    }
  }

  calcCode(ev, length, coords, name, function() {
    iv = window.setInterval(function() {shorten()}, 2000);
  });
}

function step(ev) {
  // Manual steps instead of animation
  
  if(document.getElementById("olcode").value.length < 5) {
    return;
  }
  
  highlight(document.getElementById("btn_step"));
  
  if(document.getElementById("btn_step").dataset.hasOwnProperty("active")) {
    shorten();
    return;
  }
  
  stopanimate();
  clearMap();
  
  if(!document.getElementById("location").value) {
    if(document.getElementById("olcode").value) {
      // Calculate location from code
      var olc = document.getElementById("olcode").value;
      var fullolc = paddCode(olc);
      try {
        var codeArea = OpenLocationCode.decode(fullolc);
        document.getElementById("location").value = codeArea.latitudeCenter + ", " + codeArea.longitudeCenter;
      } catch(e) {
        if (e) {
         print(e+"\nWithout padding: "+olc);
         highlight(document.getElementById("olcode"), colors.red);
         return;
        }
      }
    }
  }

  document.getElementById("btn_step").dataset.active = true;
  shorten();
}

function stopanimate() {
  // Stop animation
  clearInterval(iv);
  backgroundColorOriginal(document.getElementById("btn_startani"));
  delete document.getElementById("btn_step").dataset.active;
}

function shorten() {
  // Shorten the code one step and show the result on the map
  var olc = document.getElementById("olcode").value;
  if(olc.endsWith("+")) { // No precision // Extra precision: 42225322+ -> 42222253+
    olc = olc.slice(0, olc.length-3) + "+";
  } else if(!olc.slice(0, olc.length-2).endsWith("+")) { // Extra precision: 42222225+22232 -> 42222225+2223
    olc = olc.slice(0, olc.length-1);
  } else { // Normal precision: 42222253+22 -> 42222253
    olc = olc.slice(0, olc.length-2);
  }
  document.getElementById("olcode").value = olc;
  document.getElementById("olcode").title = "Full code: " + paddCode(olc);
  showRectangle();
  if(olc.length < 5) {
    stopanimate();
  }
}