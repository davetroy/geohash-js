var BASE32 = 											   "0123456789bcdefghjkmnpqrstuvwxyz";
var NEIGHBORS = { right  : { even :  "bc01fg45238967deuvhjyznpkmstqrwx" },
									left   : { even :  "238967debc01fg45kmstqrwxuvhjyznp" },
									top    : { even :  "p0r21436x8zb9dcf5h7kjnmqesgutwvy" },
									bottom : { even :  "14365h7k9dcfesgujnmqp0r2twvyx8zb" } };
var BORDERS   = { right  : { even : "bcfguvyz" },
									left   : { even : "0145hjnp" },
									top    : { even : "prxz" },
									bottom : { even : "028b" } };

NEIGHBORS.bottom.odd = NEIGHBORS.left.even;
NEIGHBORS.top.odd = NEIGHBORS.right.even;
NEIGHBORS.left.odd = NEIGHBORS.bottom.even;
NEIGHBORS.right.odd = NEIGHBORS.top.even;

BORDERS.bottom.odd = BORDERS.left.even;
BORDERS.top.odd = BORDERS.right.even;
BORDERS.left.odd = BORDERS.bottom.even;
BORDERS.right.odd = BORDERS.top.even;

var ZOOMLEVELS = { 3: 7, 4 : 10, 5 : 12, 6 : 15, 7 : 17, 8 : 17 };
	
BITS = [16, 8, 4, 2, 1];

function wheelZoom(a) { (a.detail || -a.wheelDelta) < 0 ? map.zoomIn() : map.zoomOut(); }

function sizeMap() {
	map = new GMap2(document.getElementById("map"));

 	map.setCenter(new GLatLng(39.024,-76.51), 9);
	map.addControl(new GSmallMapControl());	
}

function refine_interval(interval, cd, mask) {
	if (cd&mask)
		interval[0] = (interval[0] + interval[1])/2;
  else
		interval[1] = (interval[0] + interval[1])/2;
}

function decodeGeoHash(geohash) {
	var is_even = 1;
	var lat = []; var lon = [];
	lat[0] = -90.0;  lat[1] = 90.0;
	lon[0] = -180.0; lon[1] = 180.0;
	lat_err = 90.0;  lon_err = 180.0;
	
	for (i=0; i<geohash.length; i++) {
		c = geohash[i];
		cd = BASE32.indexOf(c);
		for (j=0; j<5; j++) {
			mask = BITS[j];
			if (is_even) {
				lon_err /= 2;
				refine_interval(lon, cd, mask);
			} else {
				lat_err /= 2;
				refine_interval(lat, cd, mask);
			}
			is_even = !is_even;
		}
	}
	lat[2] = (lat[0] + lat[1])/2;
	lon[2] = (lon[0] + lon[1])/2;

	return { latitude: lat, longitude: lon};
}

function encodeGeoHash(latitude, longitude) {
	var is_even=1;
	var i=0;
	var lat = []; var lon = [];
	var bit=0;
	var ch=0;
	var precision = 12;
	geohash = "";

	lat[0] = -90.0;  lat[1] = 90.0;
	lon[0] = -180.0; lon[1] = 180.0;
	
	while (geohash.length < precision) {
	  if (is_even) {
			mid = (lon[0] + lon[1]) / 2;
	    if (longitude > mid) {
				ch |= BITS[bit];
				lon[0] = mid;
	    } else
				lon[1] = mid;
	  } else {
			mid = (lat[0] + lat[1]) / 2;
	    if (latitude > mid) {
				ch |= BITS[bit];
				lat[0] = mid;
	    } else
				lat[1] = mid;
	  }

		is_even = !is_even;
	  if (bit < 4)
			bit++;
	  else {
			geohash += BASE32[ch];
			bit = 0;
			ch = 0;
	  }
	}
	return geohash;
}

function calculateHash(srcHash, dir) {
	srcHash = srcHash.toLowerCase();
	var lastChr = srcHash.charAt(srcHash.length-1);
	var type = (srcHash.length % 2) ? 'odd' : 'even';
	var base = srcHash.substring(0,srcHash.length-1);
	if (BORDERS[dir][type].indexOf(lastChr)!=-1)
		base = calculateHash(base, dir);
	return base + BASE32[NEIGHBORS[dir][type].indexOf(lastChr)];
}

GeoHashBox.prototype.centerMap = function () {
	map.setCenter(new GLatLng(this.centerPoint[0], this.centerPoint[1]), ZOOMLEVELS[this.geohash.length]);
}
	
GeoHashBox.prototype.showNeighbors = function () {
	var geohashPrefix = this.geohash.substring(0,this.geohash.length-1);
	 
	this.neighbors.top = new GeoHashBox(calculateHash(this.geohash, 'top'));
	this.neighbors.bottom = new GeoHashBox(calculateHash(this.geohash, 'bottom'));
	this.neighbors.right = new GeoHashBox(calculateHash(this.geohash, 'right'));
	this.neighbors.left = new GeoHashBox(calculateHash(this.geohash, 'left'));
	this.neighbors.topleft = new GeoHashBox(calculateHash(this.neighbors.left.geohash, 'top'));
	this.neighbors.topright = new GeoHashBox(calculateHash(this.neighbors.right.geohash, 'top'));
	this.neighbors.bottomright = new GeoHashBox(calculateHash(this.neighbors.right.geohash, 'bottom'));
	this.neighbors.bottomleft = new GeoHashBox(calculateHash(this.neighbors.left.geohash, 'bottom'));
}

GeoHashBox.prototype.plot = function () {
	var polyline = new GPolygon([
	  this.corners.topleft,
		this.corners.topright,
		this.corners.bottomright,
		this.corners.bottomleft,
	  this.corners.topleft
	  ], "#007799", 3, 0.7, "#003366", 0.5, {geodesic:true});
  map.addOverlay(polyline);
	var marker = new LabeledMarker(new GLatLng(this.box.latitude[2],this.box.longitude[2]), this.options );
	map.addOverlay(marker);
}

function GeoHashBox (geohash) {
	this.geohash = geohash;
	this.box = decodeGeoHash(geohash);
	this.corners = {};
	this.corners.topleft = new GLatLng(this.box.latitude[0], this.box.longitude[0]);
	this.corners.topright = new GLatLng(this.box.latitude[1], this.box.longitude[0]);
	this.corners.bottomright = new GLatLng(this.box.latitude[1], this.box.longitude[1]);
	this.corners.bottomleft = new GLatLng(this.box.latitude[0], this.box.longitude[1]);
	
	this.centerPoint = [ (this.box.latitude[0] + this.box.latitude[1])/2, (this.box.longitude[0] + this.box.longitude[1])/2];
	this.options = {labelText : geohash};
	var lastChr = this.geohash.charAt(this.geohash.length-1);
	this.selfPos = BASE32.indexOf(lastChr);
	this.neighbors = {};
	this.plot();
}

function geocodeAddress () {
	var address = document.getElementById("address").value;
	var geocoder = new GClientGeocoder();
	geocoder.getLatLng(address, plotGeoHash);
}

function plotGeoHash (gLatLng) {
	var geohash = encodeGeoHash(gLatLng.lat(), gLatLng.lng());
	document.getElementById("geoHash").value = geohash;
	var resolution = document.getElementById("hashResolution").value;
	geohash = geohash.substr(0,resolution);
	var geoHashBox = new GeoHashBox(geohash);
	geoHashBox.centerMap();
	geoHashBox.showNeighbors();

	boxList = document.getElementById("boxList");
	boxList.innerHTML = "LEFT(geohash," + resolution + ") IN (";
	var boxes = [];
	for (var n in geoHashBox.neighbors) {
		boxes.push("'"+geoHashBox.neighbors[n].geohash+"'");
	}
	boxList.innerHTML += boxes.join(',') + ")";

	searchInfo = document.getElementById("searchInfo");
	var xdistance = geoHashBox.neighbors.topleft.corners.topleft.distanceFrom(geoHashBox.neighbors.topright.corners.topright);
	var ydistance = geoHashBox.neighbors.topleft.corners.topleft.distanceFrom(geoHashBox.neighbors.bottomleft.corners.bottomleft);
	var searcharea = parseInt((xdistance/1000) * (ydistance/1000)*100)/100;
	if (xdistance>2000) {
		xdistance = parseInt(xdistance/10)/100;
		ydistance = parseInt(ydistance/10)/100;
		units = "km";
	} else {
		xdistance = parseInt(xdistance+0.5);
		ydistance = parseInt(ydistance+0.5);
		units = "m";
	}

	searchInfo.innerHTML = "w:" + xdistance + units + ", h:" + ydistance + units + " (" + searcharea + "km2)";
}

window.onload = function () {
	if (GBrowserIsCompatible()) {
		sizeMap();
	  GEvent.addDomListener(document.getElementById('map'), "DOMMouseScroll", wheelZoom);
	  GEvent.addDomListener(document.getElementById('map'), "mousewheel", wheelZoom);
  } else {
    alert("Sorry, your browser is lame!")
  }
  
}