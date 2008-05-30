// geohash.js
// Geohash library for Javascript
// (c) 2008 David Troy
// Code is available for free distribution under the MIT License

function GScript(src) {document.write('<' + 'script src="' + src + '"' +' type="text/javascript"><' + '/script>');}

if (window.location.toString().substr(0,4)=='file')
	var key = "ABQIAAAAS-9BXlmhAxzk5tMQ6009tBQ60YHOa08tQ3Rk7kk6p9CpE9bRLhRgOlUOLYUPHsGwp_XgmEwZWB1hnA";
else
	var key = "ABQIAAAAS-9BXlmhAxzk5tMQ6009tBSuPyGFyYqpbBL0yyePbwJ9Yzj2TRSRG70K1wsky3JHARggI0ccbJ3Y0A";

GScript('http://maps.google.com/maps?file=api&amp;v=2&amp;key=' + key);
GScript('./geohash.js');
GScript('./labeledmarker.js');

var ZOOMLEVELS = { 3: 7, 4 : 10, 5 : 12, 6 : 15, 7 : 17, 8 : 17 };
	
function getWindowDimensions () {
	var myWidth = 0, myHeight = 0;
	if(typeof(window.innerWidth) == 'number')
	{
		myWidth = window.innerWidth;
		myHeight = window.innerHeight;
	}
	else if(document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight))
	{
		myWidth = document.documentElement.clientWidth;
		myHeight = document.documentElement.clientHeight;
	}
	else if(document.body && (document.body.clientWidth || document.body.clientHeight))
	{
		myWidth = document.body.clientWidth;
		myHeight = document.body.clientHeight;
	}
	
	return {'width' : myWidth, 'height' : myHeight};
}

function wheelZoom(a) { (a.detail || -a.wheelDelta) < 0 ? map.zoomIn() : map.zoomOut(); }

function sizeMap() {
	var dims = getWindowDimensions();
	var mapdiv = document.getElementById("map");
	mapdiv.style.height = dims.height-120;
	mapdiv.style.width = dims.width;

	var headerdiv = document.getElementById("header");
	headerdiv.style.width = dims.width-30;

	var creditsdiv = document.getElementById("credits");
	creditsdiv.style.left = dims.width-180;
	
	map = new GMap2(mapdiv);
 	map.setCenter(new GLatLng(39.024,-76.51), 9);
	map.addControl(new GSmallMapControl());	
}

GeoHashBox.prototype.centerMap = function () {
	map.setCenter(this.centerPoint, ZOOMLEVELS[this.geohash.length]);
}
	
GeoHashBox.prototype.showNeighbors = function () {
	var geohashPrefix = this.geohash.substr(0,this.geohash.length-1);
	 
	this.neighbors.top = new GeoHashBox(calculateAdjacent(this.geohash, 'top'));
	this.neighbors.bottom = new GeoHashBox(calculateAdjacent(this.geohash, 'bottom'));
	this.neighbors.right = new GeoHashBox(calculateAdjacent(this.geohash, 'right'));
	this.neighbors.left = new GeoHashBox(calculateAdjacent(this.geohash, 'left'));
	this.neighbors.topleft = new GeoHashBox(calculateAdjacent(this.neighbors.left.geohash, 'top'));
	this.neighbors.topright = new GeoHashBox(calculateAdjacent(this.neighbors.right.geohash, 'top'));
	this.neighbors.bottomright = new GeoHashBox(calculateAdjacent(this.neighbors.right.geohash, 'bottom'));
	this.neighbors.bottomleft = new GeoHashBox(calculateAdjacent(this.neighbors.left.geohash, 'bottom'));
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
	this.centerPoint = new GLatLng((this.box.latitude[0] + this.box.latitude[1])/2, (this.box.longitude[0] + this.box.longitude[1])/2);

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
	if (gLatLng==null) {
		setText('boxList', 'Location not found!');
		setText('searchInfo', '');
		return false;
	}
	
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
	boxes.push("'"+geoHashBox.geohash+"'");
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
	var lat = parseInt(gLatLng.lat()*1000)/1000;
	var lng = parseInt(gLatLng.lng()*1000)/1000;
	searchInfo.innerHTML = lat + ", " + lng + " [w:" + xdistance + units + ", h:" + ydistance + units + "] (" + searcharea + "km2)";

	// var myIcon = new GIcon({image : './anchor.png', shadow : './shadow.png'});
	// var myMarker = new GMarker(gLatLng);
	// map.addOverlay(myMarker);
}

function setText(s,t) {
	sp = document.getElementById(s);
  sp.innerHTML = t;
}

function cleanUp() {
	map.clearOverlays();
	setText('boxList','');
	setText('searchInfo','');	
}

window.onload = function () {
	if (GBrowserIsCompatible()) {
		window.onresize = sizeMap;
		sizeMap();
	  GEvent.addDomListener(document.getElementById('map'), "DOMMouseScroll", wheelZoom);
	  GEvent.addDomListener(document.getElementById('map'), "mousewheel", wheelZoom);
	  } else {
	    alert("Sorry, your browser is lame!")
	  }
}
