const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const http = require('http');
var rp = require('request-promise');

var options = {
    uri: 'http://pokeapi.co/api/v2/pokemon/slowbro/',
    json: true // Automatically parses the JSON string in the response 
};

rp(options)
.then(function (response) {
	//console.log(JSON.stringify(response));
    //var data = response;
	console.log(response.location_area_encounters[0].location_area.name);
	locations = {};
	response.location_area_encounters.forEach(function(area){
		console.log(area.location_area.name + " valid for this games:");
		area.version_details.forEach(function(version){
			console.log(version.version.name);
			if(typeof(locations[version.version.name+""]) === "undefined"){
				locations[version.version.name+""] = new Array();
			}
			locations[version.version.name+""].push(area.location_area.name);
		}); 
	});
	console.log(JSON.stringify(locations));
	
})
.catch(function (err) {
    console.log("Got error: " + err.message);
});