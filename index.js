const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')
var cache = require('memory-cache');
var pokemons = require("./pkm.json");

var bot = new Bot({
	token: 'EAAW2de65Vx4BAL0uG2XZBrAQJ014m2uc1NozdhPExcznVus0ZAiGR1FVr7mE7lFWs64ZAnGxFpqSzcIUPJeYWUKXkCvbGn4Uk4VYJgTDilPrB9a9b1rv1WrfnVgEwARuSynck2yQnnyAFLzXDgmBnKEoXrhadX4ifaIorX1kwZDZD',
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
	
	bot.getProfile(payload.sender.id, (err, profile) => {
		if (err) {console.log(err)}

		const sessionId = findOrCreateSession(payload.sender.id)
		console.log(sessionId)
		var msg = payload.message.text
	    const atts = payload.message.attachments
	    var session = sessions[sessionId]
	    var tokens = payload.message.text.toLowerCase().split()
	    var answer = payload.message.text

	    if(session.isAnswering === "pokemon_game_type"){answer = getPokemonLocation(tokens, session)}

	    if(tokens.contains("where") && !tokens.contains("item")) {answer = askWhichGame(tokens, session)}

		if(tokens.contains("beat")) {answer = getPokemonFoe(tokens)}

		if(tokens.contains("where") && tokens.contains("item")) {answer = getItemLocation(tokens)}

		if(tokens.contains("info") || tokens.contains("informations") || tokens.contains("about")) {answer = getPokemonInfo(tokens)}
	    
		var text = answer
		reply({ text }, (err) => { //need to pass exact name text
			if (err) {console.log(err)}
			console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
		})
	})
})

var app = express()
app.set('port', (process.env.PORT || 5000))
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

// spin spin sugar
http.createServer(bot.middleware()).listen(app.get('port'))
console.log('running on port', app.get('port'))


//Retrive functions
function getPokemonLocation(text, session) {
	session.isAnswering = null
}
function getPokemonFoe(text) {

}
function getItemLocation(text) {

}
function getPokemonInfo(text) {

}
function askWhichGame(tokens, session) {
	if(recognizePokemon(tokens)){
		session.isAnswering = "pokemon_game_type"
		session.pokemon = pokemon
		return "could you tell me which game are you playing?"
	}else{
		return "I didn't recognize the pokemon."
	}
}
function sanitize(string){
	return string.replace(/\s/g, "").toLowerCase();
}

function beautify(string){
	return string.replace(/[\-\_\.]/g, " ");
}
function recognizePokemon(tokens) {
	var pokemon = false
	tokens.forEach(function(token){
		if(pokemons.hasOwnProperty(token)){pokemon = token}
	})
	return !!pokemon ? pokemon : false
}