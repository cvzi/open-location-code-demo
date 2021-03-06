﻿function geocode (query, cb) {
  // Geocode via mapbox service
  let localOlc = null

  // Check for a pluscode with location
  const m = query.trim().match(/^(\w+\+\w*)\s+(\S.+)/)

  if (m && m.length > 2 && m[1].length > 2 && m[2].length > 1) {
    localOlc = m[1]
    query = m[2].trim()
  }

  const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
  const req = new XMLHttpRequest()
  req.overrideMimeType('application/json')
  req.onreadystatechange = function () {
    if (req.readyState === 4 && req.status === 200) {
      const data = JSON.parse(req.responseText)
      if ('features' in data && data.features.length) {
        const coords = [data.features[0].center[1], data.features[0].center[0]]
        if (localOlc) {
          try {
            const fullOlc = OpenLocationCode.recoverNearest(localOlc, coords[0], coords[1])
            const codeArea = OpenLocationCode.decode(fullOlc)
            print('Local code: ' + localOlc + ' ' + data.features[0].place_name + '\n -> ' + fullOlc)
            cb([codeArea.latitudeCenter, codeArea.longitudeCenter], data.features[0].place_name)
            return
          } catch (e) {
            console.log('Error in recoverNearest(' + localOlc + ', ' + coords[0] + ', ' + coords[1] + '):\n' + e)
            print('⚠️ Recover from local code failed for: ' + localOlc)
          }
        }
        cb(coords, data.features[0].place_name)
      } else {
        cb(null)
      }
    }
  }
  req.open('GET', url + encodeURIComponent(query) + '.json?limit=1&access_token=' + ACCESS_TOKEN, true)
  req.send(null)
}

function print (text) {
  const n = document.createTextNode(text + '\n')
  const pre = document.getElementById('status')
  const preold = document.getElementById('statusold')
  if (pre.firstChild) {
    preold.appendChild(pre.firstChild)
    preold.scrollTo(0, preold.scrollHeight)
  }
  pre.appendChild(n)
}

function highlight (el, highlightColor, time) {
  // Change background color for {time}
  if (!el.dataset.hasOwnProperty('orgColor')) {
    el.dataset.orgColor = el.style.backgroundColor
  }
  el.style.backgroundColor = highlightColor || '#ffa'
  window.setTimeout(function () {
    el.style.backgroundColor = el.dataset.orgColor
    delete el.dataset.orgColor
  }, time || 700)
}

function backgroundColor (el, highlightColor) {
  // Set background color and store original color
  el.dataset.orgColor = el.style.backgroundColor
  el.style.backgroundColor = highlightColor || '#baf0ba'
}

function backgroundColorOriginal (el) {
  // Revert to original background color
  el.style.backgroundColor = el.dataset.orgColor
}

function replaceChar (string, replace, index) {
  // Replace the char at index with `replace`
  return string.substring(0, index) + replace + string.substring(index + 1)
}

function hex (i) {
  // Zero-padded hex number
  return Array(3 - parseInt(i).toString(16).length).join('0') + parseInt(i).toString(16)
}

function paddCode (olc) {
  // Zero-padd a short plus code
  var [a, b] = olc.split('+')
  if (a.length === 8 && !b) {
    return a + '+'
  }
  while (a.length < 8) {
    a += '00'
  }
  return a + '+' + b
}

function unPaddCode (olc) {
  // Remove zero-padd of a short plus code
  var [a, b] = olc.split('+')
  while (b && b.endsWith('0')) {
    b = b.substring(0, b.length - 1)
  }
  while (a && a.endsWith('0')) {
    a = a.substring(0, a.length - 1)
  }
  return a + '+' + b
}

function moveCode (olc, eastwest, northsouth) {
  // Move code to east/west and north/south
  if (!eastwest) {
    eastwest = 0
  }
  if (!northsouth) {
    northsouth = 0
  }

  const alphabet = OpenLocationCode.getAlphabet()

  olc = unPaddCode(olc)

  const old = olc

  if (olc.endsWith('+') || olc.length === 11) { // Lat-lng version / Normal precision
    if (olc.indexOf('+') !== -1) {
      olc = olc.replace('+', '') // Remove + for easier access with indices
    }

    const lastCharIndex = olc.length - (olc.endsWith('+') ? 2 : 1)

    // Move north/south
    let lat = alphabet.indexOf(olc.charAt(lastCharIndex - 1).toUpperCase()) + northsouth
    if (lat < 0) {
      const quotient = Math.floor(lat / alphabet.length)
      lat += alphabet.length * -quotient
      const superLat = alphabet.indexOf(olc.charAt(lastCharIndex - 3).toUpperCase()) + quotient
      olc = replaceChar(olc, alphabet[superLat], lastCharIndex - 3)
    } else if (lat >= alphabet.length) {
      const quotient = Math.floor(lat / alphabet.length)
      lat = lat % alphabet.length
      const superLat = alphabet.indexOf(olc.charAt(lastCharIndex - 3).toUpperCase()) + quotient
      olc = replaceChar(olc, alphabet[superLat], lastCharIndex - 3)
    }
    olc = replaceChar(olc, alphabet[lat], lastCharIndex - 1)

    // Move east/west
    let lng = alphabet.indexOf(olc.charAt(lastCharIndex).toUpperCase()) + eastwest
    if (lng < 0) {
      const quotient = Math.floor(lng / alphabet.length)
      lng += alphabet.length * -quotient
      const superLng = alphabet.indexOf(olc.charAt(lastCharIndex - 2).toUpperCase()) - 1
      olc = replaceChar(olc, alphabet[superLng], lastCharIndex - 2)
    } else if (lng >= alphabet.length) {
      const quotient = Math.floor(lng / alphabet.length)
      lng = lng % alphabet.length
      const superLng = alphabet.indexOf(olc.charAt(lastCharIndex - 2).toUpperCase()) + quotient
      olc = replaceChar(olc, alphabet[superLng], lastCharIndex - 2)
    }
    olc = replaceChar(olc, alphabet[lng], lastCharIndex)

    // Add +
    if (olc.length === 10) {
      olc = olc.substr(0, 8) + '+' + olc.substr(8)
    } else {
      olc += '+'
    }

    return paddCode(olc)
  } else { // 20 rectangles version / High precision
    /*
    Grid:
    R    V    W    X        16   17   18   19        0    1    2    3
    J    M    P    Q        12   13   14   15        4    5    6    7
    C    F    G    H   ->    8    9   10   11   ->   8    9   10   11
    6    7    8    9         4    5    6    7       12   13   14   15
    2    3    4    5         0    1    2    3       16   17   18   19
    */

    const charIndex = olc.length - 1

    let value = alphabet.indexOf(olc.charAt(charIndex).toUpperCase())

    northsouth *= -1

    // Move east/west
    const rowNumber = Math.floor(value / 4)
    const newRowNumber = Math.floor((value + eastwest) / 4)
    if (rowNumber !== newRowNumber) { // Out of row
      const lastChar = olc.charAt(charIndex) // Shorten the code one digit
      olc = moveCode(olc.substring(0, old.length - 1), newRowNumber - rowNumber, 0) //  Move recursively
      olc += lastChar // Add the char again

      value = value + eastwest
      value -= (newRowNumber - rowNumber) * 4

      olc = replaceChar(olc, alphabet[value], charIndex)
    } else {
      value = value + eastwest
      olc = replaceChar(olc, alphabet[value], charIndex)
    }

    // Move north/south
    if (value + 4 * northsouth < 0 || value + 4 * northsouth >= 20) { // Out of box
      const boxDiff = Math.floor((value + 4 * northsouth) / 20)

      const lastChar = olc.charAt(charIndex) // Shorten the code one digit
      olc = moveCode(olc.substring(0, old.length - 1), 0, boxDiff) //  Move recursively
      olc += lastChar // Add the char again

      value = (value + 4 * northsouth) % 20
      if (value < 0) {
        value += 20
      }

      olc = replaceChar(olc, alphabet[value], charIndex)
    } else {
      value = value + 4 * northsouth
      olc = replaceChar(olc, alphabet[value], charIndex)
    }

    return olc
  }
}
