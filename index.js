const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')
var _intersect_ = require('intersect')
var replyto = require("./js/reply.js")
var get = require("./js/get.js")

var location_keywords = ["where", "location", "located"]
var info_keywords = ["info", "infos", "information", "informations", "who"]
var thanks_keywords = ["thanks", "tnx", "ty","(Y)"]
var beat_keywords = ["beat", "defeat", "rid", "overcome", "counter"]
var greetings_keywords = ["hello", "hi", "hei", "ola"]
var bye_keywords = ["bye", "see u", "see ya", "see you", "byebye"]
var yes_keywords = ["ok", "yes", "yep", "okok", "alright"]
var no_keywords = ["no", "nope", "nono"]

var bot = new Bot({
	token: 'EAAW2de65Vx4BAIXZByCu6EhYvMgqhfioY6pZA3TGLFr4JDOUsE4dbdZB5ppo5cRWCXQLjzuh4hksk3HNhjZCglYeZBowUTvKEh5YD4PqBjdc2ySJOgZAU4sVCvnvSWiLkr3U26KyuUiz3txnrCdfaM4OfwQl2Y3PJNnfmhmZBsBywZDZD',
	verify: 'my_voice_is_my_password_verify_me'
})

Array.prototype.contains = function(obj) {
	return this.indexOf(obj) > -1;
};

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function intersect(a, b) {
	return !!_intersect_(a, b).length 
}

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
		var msg = payload.message.text
	    const atts = payload.message.attachments
	    var session = sessions[sessionId]
	    var tokens = payload.message.text.toLowerCase().replace(/[\?\!\.\,\_]/g, ' ').split(' ')
	    var answer = payload.message.text
	   
	    if(session.isAnswering === "pokemon_game_type"){get.getPokemonLocation(reply, profile, answer, session)}else // Location
	    
	    if(intersect(tokens, location_keywords) && !tokens.contains("item")) {get.askWhichGame(reply, profile,  tokens, session)}else //ask game
	    
		if(intersect(tokens, beat_keywords)) {get.getPokemonWeakness(reply, profile, tokens)}else // Best move
	    
	    if(intersect(tokens, greetings_keywords)) {get.getGreeting(reply, profile, session)}else
	    
	    if(intersect(tokens, thanks_keywords)) {get.getThank(reply, profile)}else
	    
	    if(intersect(tokens, bye_keywords)) {get.getBye(reply, profile)}else
	    
	    if(tokens.contains("help")) {get.getHelp(reply, profile)}else
	    
	    if(intersect(tokens, yes_keywords)) {replyto.replyToUser(reply, profile, "GG")}else
	    
	    if(intersect(tokens, no_keywords)) {replyto.replyToUser(reply, profile, "Why? :P")}else

	    {
	    	var recognizedPokemon = get.recognizePokemon(tokens)
	    	var recognizedMove = get.recognizeMove(msg)
	    	var recognizedItem = get.recognizeItem(msg)
	    	var recognize = get.recognize(tokens)
	    	var recognizedEmoji = recognize[0]
	    	var recognizedLaughs = recognize[1]

	    	if(!!recognizedPokemon) {get.getPokemonInfo(reply, profile, recognizedPokemon)}else
	    	if(!!recognizedMove) {get.getMoveInfo(reply, profile, recognizedMove)}else
	    	if(!!recognizedItem) {get.getItemInfo(reply, profile, recognizedItem)}else
	    	if(!!recognizedEmoji) {replyto.replyToUser(reply, profile, recognizedEmoji)}else
	    	if(!!recognizedLaughs) {replyto.replyToUser(reply, profile, "(Y)")}else
	    	{get.getNotUnderstand(reply, profile, session)}
	    }
	})
})

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
var app = express()
app.set('port', (server_port))
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
http.createServer(bot.middleware()).listen(app.get('port'), server_ip_address)
console.log('running on port', app.get('port'))
