const COLORS = {
  red: '#fcc',
  green: '#baf0ba',
  yellow: '#ffa'
}
const MAX_ZOOM = 24

var map
var iv
const layers = []
var gwid

function showRectangle () {
  // Show the rectangle of the current plus code
  const alphabet = OpenLocationCode.getAlphabet()
  const olc = document.getElementById('olcode').value
  const l = olc.length > 11 ? 11 : olc.length
  const lat = alphabet.indexOf(olc.charAt(0).toUpperCase()) * alphabet.length
  const lng = alphabet.indexOf(olc.charAt(1).toUpperCase()) * alphabet.length
  const red = hex(l * 20)
  const green = hex(30)
  const blue = hex(255 * lat * lng / (499 * 499))
  const opacity = l / 11.1

  const fullolc = paddCode(olc)
  let codeArea
  try {
    codeArea = OpenLocationCode.decode(fullolc)
    document.getElementById('olcode').title = 'Full code: ' + paddCode(olc)
  } catch (e) {
    if (olc.indexOf('+') !== -1) {
      highlight(document.getElementById('olcode'), COLORS.yellow)
      geocode(olc, function (coords, name) {
        if (coords) {
          const newfullolc = OpenLocationCode.encode(coords[0], coords[1], OpenLocationCode.CODE_PRECISION_EXTRA)
          document.getElementById('olcode').value = newfullolc
          highlight(document.getElementById('olcode'), COLORS.green)
          showRectangle()
          found = true
        } else {
          // Might be local code without location -> use current map position as location:
          const localOlc = olc.trim().split(/\s/)[0]
          try {
            const newfullolc = OpenLocationCode.recoverNearest(localOlc, map.getCenter().lat, map.getCenter().lng)
            document.getElementById('olcode').value = newfullolc
            print('Assuming map center as location for local code: ' + localOlc + '\n -> ' + newfullolc)
            highlight(document.getElementById('olcode'), COLORS.green)
            showRectangle()
            found = true
          } catch (recoverException) {
            console.log(e)
            print(e + '\nInput: ' + olc + '\n' + recoverException + '\nCode: ' + localOlc)
          }
        }
      })
    } else if (e) {
      print(e + '\nWithout padding: ' + olc)
      highlight(document.getElementById('olcode'), COLORS.red)
    }
    return
  }

  const bounds = [[codeArea.latitudeLo, codeArea.longitudeLo], [codeArea.latitudeHi, codeArea.longitudeHi]]
  map.fitBounds(bounds, { maxZoom: map.getZoom() > 18 ? MAX_ZOOM : 18 }) // Zoom in, but not to close
  const rect = L.rectangle(bounds, { color: '#' + red + green + blue, weight: 1, opacity: opacity }).addTo(map)
  layers.push(rect)
}

function clearMap () {
  // Reset map drawing
  for (let i = 0; i < layers.length; i++) {
    layers[i].remove()
  }
}

function calcCode (ev, length, coords, name, foundcb) {
  // Calculate plus code from coordinates or geocode service result
  if (!length) {
    length = OpenLocationCode.CODE_PRECISION_EXTRA
  }
  const query = document.getElementById('location').value
  if (!coords) {
    try {
      coords = query.match(/([-+]?\d+\.\d+)\s*,\s*([-+]?\d+.\d+)/).slice(1).map(s => parseFloat(s))
    } catch (e) {
      if (ev !== -1) {
        geocode(query, function (coords, name) {
          calcCode(-1, length, coords, name, foundcb)
          print('Geocoding found: ' + name + '\n -> ' + coords)
        })
      } else {
        print('Geocoding not found: ' + query)
        highlight(document.getElementById('location'), COLORS.red)
      }
      return
    }
  }
  const olc = OpenLocationCode.encode(coords[0], coords[1], length)
  document.getElementById('olcode').value = olc
  document.getElementById('olcode').title = 'Full code: ' + paddCode(olc)
  highlight(document.getElementById('olcode'), COLORS.yellow)
  showRectangle()
  if (foundcb) {
    foundcb(olc)
  }
}

function animate (ev, length, coords, name) {
  // Start animation
  stopanimate()
  backgroundColor(document.getElementById('btn_startani'))
  clearMap()

  if (!document.getElementById('location').value) {
    if (document.getElementById('olcode').value) {
      // Calculate location from code
      const olc = document.getElementById('olcode').value
      const fullolc = paddCode(olc)
      try {
        const codeArea = OpenLocationCode.decode(fullolc)
        document.getElementById('location').value = codeArea.latitudeCenter + ', ' + codeArea.longitudeCenter
      } catch (e) {
        if (e) {
          print(e + '\nWithout padding: ' + olc)
          highlight(document.getElementById('olcode'), COLORS.red)
          return
        }
      }
    }
  }

  calcCode(ev, length, coords, name, function () {
    iv = window.setInterval(function () { shorten() }, 2000)
  })
}

function stopanimate () {
  // Stop animation
  clearInterval(iv)
  backgroundColorOriginal(document.getElementById('btn_startani'))
  delete document.getElementById('btn_step').dataset.active
}

function step (ev) {
  // Manual steps instead of animation

  if (document.getElementById('olcode').value.length < 5) {
    return
  }

  highlight(document.getElementById('btn_step'))

  if (document.getElementById('btn_step').dataset.hasOwnProperty('active')) {
    shorten()
    return
  }

  stopanimate()
  clearMap()

  if (!document.getElementById('location').value) {
    if (document.getElementById('olcode').value) {
      // Calculate location from code
      const olc = document.getElementById('olcode').value
      const fullolc = paddCode(olc)
      try {
        const codeArea = OpenLocationCode.decode(fullolc)
        document.getElementById('location').value = codeArea.latitudeCenter + ', ' + codeArea.longitudeCenter
      } catch (e) {
        if (e) {
          print(e + '\nWithout padding: ' + olc)
          highlight(document.getElementById('olcode'), COLORS.red)
          return
        }
      }
    }
  }

  document.getElementById('btn_step').dataset.active = true
  shorten()
}

function shorten () {
  // Shorten the code one step and show the result on the map
  let olc = document.getElementById('olcode').value
  if (olc.endsWith('+')) { // No precision // Extra precision: 42225322+ -> 42222253+
    olc = olc.slice(0, olc.length - 3) + '+'
  } else if (!olc.slice(0, olc.length - 2).endsWith('+')) { // Extra precision: 42222225+22232 -> 42222225+2223
    olc = olc.slice(0, olc.length - 1)
  } else { // Normal precision: 42222253+22 -> 42222253
    olc = olc.slice(0, olc.length - 2)
  }
  document.getElementById('olcode').value = olc
  document.getElementById('olcode').title = 'Full code: ' + paddCode(olc)
  showRectangle()
  if (olc.length < 5) {
    stopanimate()
  }
}

function grid () {
  // Show the grid around the current plus code

  stopanimate()
  clearMap()

  const olc = document.getElementById('olcode').value

  const red = hex(120)
  const green = hex(120)
  const blue = hex(120)
  const opacity = 0.3

  // Validate code
  const fullolc = paddCode(olc)
  try {
    OpenLocationCode.decode(fullolc)
    document.getElementById('olcode').title = 'Full code: ' + paddCode(olc)
  } catch (e) {
    if (e) {
      print(e + '\nWithout padding: ' + olc)
      highlight(document.getElementById('olcode'), COLORS.red)
      return
    }
  }

  // Create grid

  const layerGroup = L.layerGroup() // Group all rectangles and text together and draw them at once

  for (let y = -2; y < 3; y++) {
    for (let x = -3; x < 4; x++) {
      if (x === 0 && y === 0) continue

      const movedolc = moveCode(fullolc, x, y)

      const codeArea = OpenLocationCode.decode(movedolc)

      const bounds = [[codeArea.latitudeLo, codeArea.longitudeLo], [codeArea.latitudeHi, codeArea.longitudeHi]]

      L.rectangle(bounds, { color: '#' + red + green + blue, weight: 1, opacity: opacity }).addTo(layerGroup)

      // Add transparent marker with text tooltip
      const marker = new L.marker([0.5 * (bounds[0][0] + bounds[1][0]), 0.5 * (bounds[0][1] + bounds[1][1])], { opacity: 0.01 })
      let label = unPaddCode(movedolc)
      if (label.length >= 11) {
        label = '+' + label.split('+')[1]
      }
      marker.bindTooltip(label, { permanent: true, className: 'mapgridlabel', direction: 'center', offset: [0, 0] })
      marker.addTo(layerGroup)
    }
  }

  layerGroup.addTo(map)
  layers.push(layerGroup)

  showRectangle()

  map.zoomOut()
}

function onMapClick (ev) {
  document.getElementById('location').value = ev.latlng.lat + ', ' + ev.latlng.lng
  calcCode()
}

function findCode () {
  // Button handler
  if (document.getElementById('location').value) {
    calcCode()
  }
}

function showCodeOnMap () {
  // Button handler
  if (document.getElementById('olcode').value) {
    showRectangle()
  }
}
function showIntro () {
  introJs().start().onexit(function () {
    document.location.hash = '#nointro'
    sessionStorage.setItem('nointro', true)
  })
}
function myLocation () {
  if (gwid != null) {
    navigator.geolocation.clearWatch(gwid)
    document.querySelector('.mylocation span').style.backgroundPosition = '0em'
    gwid = null
    return
  }
  let lastPos = null
  document.querySelector('.mylocation span').style.backgroundPosition = '1em'
  navigator.geolocation.getCurrentPosition(function onSuccess (position) {
    document.querySelector('.mylocation span').style.backgroundPosition = '2em'
    lastPos = Math.round(10000 * position.coords.latitude) + ',' + Math.round(10000 * position.coords.longitude)
    document.getElementById('location').value = `${position.coords.latitude}, ${position.coords.longitude}`
    highlight(document.getElementById('location'), COLORS.green)
    findCode()
    navigator.geolocation.clearWatch(gwid)
    gwid = navigator.geolocation.watchPosition(function onWatchSuccess (position) {
      const pos = Math.round(10000 * position.coords.latitude) + ',' + Math.round(10000 * position.coords.longitude)
      if (pos === lastPos) {
        return
      }
      lastPos = pos
      document.getElementById('location').value = `${position.coords.latitude}, ${position.coords.longitude}`
      highlight(document.getElementById('location'), COLORS.green)
      findCode()
    }, function onWatchError (error) {
      print(`Error(${error.code}): ${error.message}`)
      navigator.geolocation.clearWatch(gwid)
      document.querySelector('.mylocation span').style.backgroundPosition = '0em'
      gwid = null
    }, {
      enableHighAccuracy: true
    })

    window.setTimeout(function () {
      document.querySelector('.mylocation span').style.backgroundPosition = '0em'
      navigator.geolocation.clearWatch(gwid)
      gwid = null
    }, 20000)
  }, function onError (error) {
    print(`Error(${error.code}): ${error.message}`)
    document.querySelector('.mylocation span').style.backgroundPosition = '0em'
  }, {
    enableHighAccuracy: true
  })
}

function main () {
  const isMobile = navigator.userAgent.match(/mobile/i)
  if (isMobile) {
    document.getElementById('desc').style.maxWidth = window.screen.width - 50 + 'px'
    document.getElementsByName('viewport')[0].setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0')
  }

  let width = Math.floor(window.outerWidth * 0.7)
  let height = Math.floor(window.outerHeight * 0.6)
  width = width > 1400 ? 1400 : (width < 400 ? 400 : width)
  height = height > 800 ? 800 : (height < 300 ? 300 : height)
  if (isMobile) {
    width = window.screen.width - 30
    height = Math.min(width, height)
  }
  document.getElementById('mapid').style.width = width + 'px'
  document.getElementById('mapid').style.height = height + 'px'

  map = L.map('mapid').setView([49.41, 8.71], 11)
  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: MAX_ZOOM,
    tileSize: 512,
    zoomOffset: -1,
    id: 'mapbox/streets-v11',
    accessToken: ACCESS_TOKEN
  }).addTo(map)
  map.on('dblclick', onMapClick)
  map.on('contextmenu', onMapClick)

  document.getElementById('location').addEventListener('change', findCode)
  document.getElementById('btn_find').addEventListener('click', findCode)
  document.getElementById('btn_startani').addEventListener('click', animate)
  document.getElementById('btn_step').addEventListener('click', step)
  document.getElementById('btn_grid').addEventListener('click', grid)
  document.getElementById('olcode').addEventListener('keyup', showCodeOnMap)
  document.getElementById('btn_stopani').addEventListener('click', function () {
    stopanimate()
  })
  document.getElementById('btn_clear').addEventListener('click', function () {
    stopanimate()
    document.getElementById('location').value = ''
    document.getElementById('olcode').value = ''
    clearMap()
  })
  if (document.querySelector('.mylocation')) {
    document.querySelector('.mylocation').addEventListener('click', myLocation)
  }

  document.getElementById('intro_link').addEventListener('click', showIntro)
  if ((document.location.hash.indexOf('nointro') === -1 && !sessionStorage.getItem('nointro')) || document.location.hash === '#intro') {
    showIntro()
  }
}
