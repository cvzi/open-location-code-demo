function geocode(query, cb) {
  var url = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
  var req = new XMLHttpRequest();
  req.overrideMimeType("application/json");
  req.onreadystatechange = function() { 
    if (req.readyState == 4 && req.status == 200) {
      let data = JSON.parse(req.responseText);
      if(data["features"]) {
        let coords = [data["features"][0]["center"][1], data["features"][0]["center"][0]];
        cb(coords, data["features"][0]["place_name"]);
      } else {
        cb(null);
      }
    }
  }
  req.open("GET", url + encodeURIComponent(query) + ".json?limit=1&access_token=" + access_token, true);
  req.send(null);
}

function print(text) {
  var n = document.createTextNode(text+"\n");
  var pre = document.getElementById("status");
  var preold = document.getElementById("statusold");
  if(pre.firstChild) {
    preold.appendChild(pre.firstChild);
    preold.scrollTo(0, preold.scrollHeight);
  }
  pre.appendChild(n);
}

function highlight(el, highlightColor, time) {
  // Change background coor for {time} 
  if(!el.dataset.hasOwnProperty("orgColor")) {
    el.dataset.orgColor = el.style.backgroundColor;
  }
  el.style.backgroundColor = highlightColor?highlightColor:"#ffa";
  window.setTimeout(function() {
    el.style.backgroundColor = el.dataset.orgColor;
    delete el.dataset.orgColor;
  }, time?time:700);
}

function backgroundColor(el, highlightColor) {
  // Set background color and store original color
  el.dataset.orgColor = el.style.backgroundColor;
  el.style.backgroundColor = highlightColor?highlightColor:"#baf0ba";
}
function backgroundColorOriginal(el) {
  // Revert to original background color
  el.style.backgroundColor = el.dataset.orgColor;
}

function hex(i) {
  // Zero-padded hex number
  return Array(3 - parseInt(i).toString(16).length).join("0") + parseInt(i).toString(16);
}

function paddCode(olc) {
  // Zero-padd a short plus code
  var [a,b] = olc.split("+");
  while(a.length < 8) {
    a += "00";
  }
  return a + "+" + b;
}
