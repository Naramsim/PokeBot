const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')
var _intersect_ = require('intersect')
var rp = require('request-promise')
var cache = require('memory-cache')
var pokemons = require("./pkm.json")

var location_keywords = ["where", "location", "located"]
var thanks_keywords = ["thanks", "tnx", "ty","(Y)"]
var greetings_keywords = ["hello", "hi", "hei", "ola"]
var got_it = false

var bot = new Bot({
	token: 'EAAW2de65Vx4BAIXZByCu6EhYvMgqhfioY6pZA3TGLFr4JDOUsE4dbdZB5ppo5cRWCXQLjzuh4hksk3HNhjZCglYeZBowUTvKEh5YD4PqBjdc2ySJOgZAU4sVCvnvSWiLkr3U26KyuUiz3txnrCdfaM4OfwQl2Y3PJNnfmhmZBsBywZDZD',
	verify: 'my_voice_is_my_password_verify_me',
	app_secret: '42d06cc77f08dc8f12cef15985dadd5e'
})

Array.prototype.contains = function(obj) {
	return this.indexOf(obj) > -1;
};

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
	var sessionId;
  	// Let's see if we already have a session for the user fbid
  	Object.keys(sessions).forEach(k => {
	  	if (sessions[k].fbid === fbid) {
	      	// Yep, got it!
	     	sessionId = k;
	  	}
	});
  	if (!sessionId) {
	    // No session found for user fbid, let's create a new one
	    sessionId = new Date().toISOString();
	    sessions[sessionId] = {fbid: fbid, context: {}};
	}
	return sessionId;
};

bot.on('error', (err) => {
	console.log(err.message)
})

bot.on('message', (payload, reply) => {
	console.log("new msg")
	bot.getProfile(payload.sender.id, (err, profile) => {
		if (err) {console.log(err)}

		const sessionId = findOrCreateSession(payload.sender.id)
		console.log(sessionId)
		var msg = payload.message.text
	    const atts = payload.message.attachments
	    var session = sessions[sessionId]
	    var tokens = payload.message.text.toLowerCase().replace(/[\?\!\.\,\_]/g, ' ').split(' ')
	    console.log(tokens)
	    var answer = payload.message.text
	    got_it = false

	    if(session.isAnswering === "pokemon_game_type"){getPokemonLocation(reply, profile,  answer, session);got_it=1} // Location

	    if(intersect(tokens, location_keywords) && !tokens.contains("item")) {askWhichGame(reply, profile,  tokens, session);got_it=1} //ask game

		if(tokens.contains("beat")) {getPokemonWeakness(tokens);got_it=1} // Best move

		if(tokens.contains("where") && tokens.contains("item")) {getItemLocation(tokens);got_it=1}

		if(tokens.contains("info") || tokens.contains("informations") || tokens.contains("about")) {getPokemonInfo(tokens);got_it=1}
	    
	    if(intersect(tokens, greetings_keywords)) {getGreeting(reply, profile);got_it=1}

	    if(intersect(tokens, thanks_keywords)) {getThank(reply, profile);got_it=1}

	    tokens.forEach(function(token){
	    	if(token.match(/(?:[aeiou]*(?:[hj][aeiou])+h?|(?:l+o+)+l+)/g)){replyToUser(reply, profile, "(Y)");got_it=1}
	    })

	    if(!got_it) {getNotUnderstand(reply, profile)}
		
	})
})

var app = express()
app.set('port', (process.env.PORT || 3000))
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))
// parse application/json
app.use(bodyParser.json())

app.get('/', (req, res) => {
	return bot._verify(req, res)
})

app.post('/', (req, res) => {
	bot._handleMessage(req.body.entry)
	res.end(JSON.stringify({status: 'ok'}))
})

http.createServer(bot.middleware()).listen(app.get('port'))
console.log('running on port', app.get('port'))


//Retrive functions
function replyToUser(reply, profile, answer){
	var text = answer
	reply({ text }, (err) => { //need to pass exact name text
		if (err) {console.log(err)}
		console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
	})
}
function getPokemonLocation(reply, profile, text, session) {
	session.isAnswering = null
	var pokemon_game_type = recognize_game_type(text)
	var pokemon = session.pokemon
	console.log("pokemon: "+pokemon)
	console.log("pokeomn game type: "+pokemon_game_type)

	var options = {
	    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon,
	    json: true // Automatically parses the JSON string in the response 
	}

	rp(options)
    .then(function (response) {
    	//console.log(JSON.stringify(response))
        //var data = response
		//console.log(data.location_area_encounters[0].location_area.name)
		locations = {}
		response.location_area_encounters.forEach(function(area){
			console.log(area.location_area.name + " valid for this games:")
			area.version_details.forEach(function(version){
				console.log(version.version.name)
				if(typeof(locations[version.version.name+""]) === "undefined"){
					locations[version.version.name+""] = new Array()
				}
				locations[version.version.name+""].push(area.location_area.name)
			}) 
		})
		//console.log(JSON.stringify(locations))
		var locationsSize = locations[pokemon_game_type].length - 1
		console.log(locationsSize)
		if(locationsSize === 0) {replyToUser(reply, profile, "you can't catch " + pokeomn + "here")}
		var toReturn = ""
		locations[pokemon_game_type].forEach(function(loc, i){
			if(i === locationsSize){
				toReturn = toReturn + " or " + loc
			}else{
				toReturn = toReturn + ", " + loc
			}
		})
		toReturn = beautify(toReturn.slice(2).replace("/(?:\d|\w)+f\,/g", ""))
		toReturn = "Try near " + toReturn
		console.log(toReturn)
		replyToUser(reply, profile, toReturn)
    })
	.catch(function (err) {
        replyToUser(reply, profile, "You can't catch this pokemon here")
        console.log(err)
    });
}
function getPokemonWeakness(text) {

}
function getItemLocation(text) {

}
function getPokemonInfo(text) {

}
function askWhichGame(reply, profile, tokens, session) {
	var pokemon = recognizePokemon(tokens)
	if(pokemon){
		session.isAnswering = "pokemon_game_type"
		session.pokemon = pokemon
		replyToUser(reply, profile, "could you tell me which game are you playing?")
	}else{
		replyToUser(reply, profile, "I didn't recognize the pokemon.")
	}
}
function sanitize(string) {
	return string.replace(/\s/g, "").toLowerCase();
}

function beautify(string) {
	return string.replace(/[\-\_\.]/g, " ");
}
function recognizePokemon(tokens) {
	var pokemon = false
	tokens.forEach(function(token){
		if(pokemons.hasOwnProperty(token)){pokemon = token}
	})
	return !!pokemon ? pokemon : false
}
function recognize_game_type(text) {
	return sanitize(text)
}
function intersect(a, b) {
	return !!_intersect_(a, b).length 
}
function getGreeting(reply, profile) {
	replyToUser(reply, profile, "Hello!")
}
function getThank(reply, profile) {
	replyToUser(reply, profile, "You're welcome")
}
function getNotUnderstand(reply, profile) {
	replyToUser(reply, profile, profile.first_name + ", I didn't catch what you said")
}