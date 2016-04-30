const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')
var _intersect_ = require('intersect')
var rp = require('request-promise')
var cache = require('memory-cache')
var pokemons = require("./pkm.json")
var items = require("./items.json")
var games = require("./pkm_games.json")
var moves = require("./moves.json")

var location_keywords = ["where", "location", "located"]
var info_keywords = ["info", "infos", "information", "informations", "who"]
var thanks_keywords = ["thanks", "tnx", "ty","(Y)"]
var beat_keywords = ["beat", "defeat", "rid", "overcome", "counter"]
var greetings_keywords = ["hello", "hi", "hei", "ola"]
var bye_keywords = ["bye", "see u", "see ya", "see you", "byebye"]
var yes_keywords = ["ok", "yes", "yep", "okok", "alright"]
var no_keywords = ["no", "nope", "nono"]
var got_it = false
var TIMEOUT_LIMIT = 30000 //30 seconds
var CACHE_LIMIT = 1000000 * 1000 //11 days

var bot = new Bot({
	token: 'EAAW2de65Vx4BAIXZByCu6EhYvMgqhfioY6pZA3TGLFr4JDOUsE4dbdZB5ppo5cRWCXQLjzuh4hksk3HNhjZCglYeZBowUTvKEh5YD4PqBjdc2ySJOgZAU4sVCvnvSWiLkr3U26KyuUiz3txnrCdfaM4OfwQl2Y3PJNnfmhmZBsBywZDZD',
	verify: 'my_voice_is_my_password_verify_me',
	app_secret: '42d06cc77f08dc8f12cef15985dadd5e'
})

Array.prototype.contains = function(obj) {
	return this.indexOf(obj) > -1;
};

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

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
		var msg = payload.message.text
	    const atts = payload.message.attachments
	    var session = sessions[sessionId]
	    var tokens = payload.message.text.toLowerCase().replace(/[\?\!\.\,\_]/g, ' ').split(' ')
	    var answer = payload.message.text
	    
	    var recognizedItems = _intersect_(tokens, items)
	    if(session.isAnswering !== "pokemon_game_type" && recognizedItems.length>0){
			getItemInfo(reply, profile, recognizedItems)
		}else
	    

	    if(session.isAnswering === "pokemon_game_type"){getPokemonLocation(reply, profile, answer, session)}else // Location
	    

	    if(intersect(tokens, location_keywords) && !tokens.contains("item")) {askWhichGame(reply, profile,  tokens, session)}else //ask game
	    

		if(intersect(tokens, beat_keywords)) {getPokemonWeakness(reply, profile, tokens)}else // Best move
	    
		
	    if(intersect(tokens, greetings_keywords)) {getGreeting(reply, profile, session)}else
	    

	    if(intersect(tokens, thanks_keywords)) {getThank(reply, profile)}else
	    

	    if(intersect(tokens, bye_keywords)) {getBye(reply, profile)}else
	    

	    if(tokens.contains("help")) {getHelp(reply, profile)}else
	    

	    if(intersect(tokens, yes_keywords)) {replyToUser(reply, profile, "GG")}else
	    

	    if(intersect(tokens, no_keywords)) {replyToUser(reply, profile, "Why? :P")}else

	    {
	    	var recognizedPokemon = recognizePokemon(tokens)
	    	console.log(recognizedPokemon)
	    	var recogniziedMove = recognizieMove(msg)
	    	if(!!recognizedPokemon) {getPokemonInfo(reply, profile, recognizedPokemon)}else
	    	if(!!recogniziedMove) {getMoveInfo(reply, profile, recogniziedMove)}else
	    	{getNotUnderstand(reply, profile, session)}

	    	tokens.forEach(function(token){
		    	var emoji = token.match(/(\:\w+\:|\<[\/\\]?3|[\(\)\\\D|\*\$][\-\^]?[\:\;\=]|[\:\;\=B8][\-\^]?[3DOPp\@\$\*\\\)\(\/\|])(?=\s|[\!\.\?]|$)/g);
		    	if(token.match(/(?:[aeiou]*(?:[hj][aeiou])+h?|(?:l+o+)+l+)/g) ){replyToUser(reply, profile, "(Y)")}
		    	if(emoji){replyToUser(reply, profile, emoji[0])}
		    })
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


//Retrive functions
function replyToUser(reply, profile, answer){
	if(!!answer) {
		var answerLength = answer.length
		var text = answer.slice(0, 300)
		reply({ text }, (err) => { //need to pass exact name text
			if (err) {console.log(err)}
			try{
				replyToUser(reply, profile, answer.slice(300))
				console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
			}catch(e){console.log(e)}
		})	
	}
}
function replyToUserWithImage(reply, profile, imageUrl) {
	var attachment = {"type": "image",
						"payload": {"url": imageUrl}}
	reply({ attachment }, (err) => { //need to pass exact name text
		if (err) {console.log(err)}
		try{
			console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${imageUrl}`)
		}catch(e){console.log(e)}
	})
}
function getPokemonLocation(reply, profile, text, session) {
	session.isAnswering = null
	var pokemon_game_type = recognize_game_type(text)
	var pokemon = session.pokemon
	if(!games.contains(pokemon_game_type)){
		var supported_games = ""
		games.forEach(function(game){supported_games = supported_games + game + ", "})
		supported_games = supported_games.slice(0, -2)
		replyToUser(reply, profile, `I don't know that game...\nThese are the games that I know: ${supported_games}`)
		return
	}
	
	var cachedResult = cache.get(pokemon)
	if(cachedResult !== null){
		returnLocation(cachedResult)
		console.log("From cache")
	}else{
		var options = {
		    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon,
		    json: true, // Automatically parses the JSON string in the response 
		    timeout: TIMEOUT_LIMIT
		}
		rp(options)
	    .then(function (response) {
	    	returnLocation(response)
	    })
		.catch(function (err) {
	        replyToUser(reply, profile, "You can't catch this pokemon here")
	        console.log(err)
	    });
	}

    function returnLocation(response){
    	cache.put(pokemon, response, CACHE_LIMIT) //one day
    	var pokemon_sprite = response.sprites.back_default
		locations = {}
		response.location_area_encounters.forEach(function(area){
			//console.log(area.location_area.name + " valid for this games:")
			area.version_details.forEach(function(version){
				//console.log(version.version.name)
				if(typeof(locations[version.version.name+""]) === "undefined"){
					locations[version.version.name+""] = new Array()
				}
				locations[version.version.name+""].push(area.location_area.name)
			}) 
		})
		//console.log(JSON.stringify(locations))
		if(!locations[pokemon_game_type]){replyToUser(reply, profile, "Nope, you can't catch it here.");return;}
		var locationsSize = locations[pokemon_game_type].length - 1
		
		if(locationsSize === 0) {replyToUser(reply, profile, "you can't catch " + pokemon + "here")}
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
		replyToUserWithImage(reply, profile, pokemon_sprite)
		replyToUser(reply, profile, toReturn)
    }
}
function getPokemonWeakness(reply, profile, tokens) {
	var pokemon = recognizePokemon(tokens)
	var cachedResult = cache.get(pokemon)
	if(cachedResult !== null){
		returnWeakness(cachedResult)
		console.log("From cache")
	}else{
		var options = {
		    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon,
		    json: true, // Automatically parses the JSON string in the response 
		    timeout: TIMEOUT_LIMIT
		}
		rp(options)
	    .then(function (response) {
	    	returnWeakness(response)
	    })
		.catch(function (err) {
	        replyToUser(reply, profile, "I can't identify that pokemon :'(")
	        console.log(err)
	    })
	}

	function returnWeakness (response) {
		cache.put(pokemon, response, CACHE_LIMIT) //one day
		var pokemon_types = []
		response.types.forEach(function(type){pokemon_types.push(type.type.name)})
		var pokemon_sprite = response.sprites.front_default
		var weakness = {}
		var cycleIndex = 0
		pokemon_types.forEach(function(type){ //for each pokemon type
			var options = {
			    uri: 'http://pokeapi.co/api/v2/type/'+ type,
			    json: true // Automatically parses the JSON string in the response 
			}
			rp(options)
		    .then(function (response) { //
				var damage_relations = response.damage_relations
				var no_damage_from = damage_relations.no_damage_from
				var half_damage_from = damage_relations.half_damage_from
				var double_damage_from = damage_relations.double_damage_from
				no_damage_from.forEach(function(type){
					if(weakness.hasOwnProperty(type.name)){weakness[type.name] = weakness[type.name] * 0}
					else{weakness[type.name] = 0}
				})
				half_damage_from.forEach(function(type){
					if(weakness.hasOwnProperty(type.name)){weakness[type.name] = weakness[type.name] * 0.5}
					else{weakness[type.name] = 0.5}
				})
				double_damage_from.forEach(function(type){
					if(weakness.hasOwnProperty(type.name)){weakness[type.name] = weakness[type.name] * 2}
					else{weakness[type.name] = 2}
				})
				cycleIndex += 1
				if(cycleIndex === pokemon_types.length){
					var best_attacks = ""
					var pro_attacks = ""
					var weak_attacks = ""
					var shit_attacks = ""
					Object.keys(weakness).forEach(function (key) {
					    if(weakness[key] === 0){shit_attacks = shit_attacks + key + ", "}
					    if(weakness[key] === 0.25){shit_attacks = shit_attacks + key + ", "}
					    if(weakness[key] === 0.5){weak_attacks = weak_attacks + key + ", "}
					    if(weakness[key] === 2){pro_attacks = pro_attacks + key + ", "}
					    if(weakness[key] === 4){best_attacks = best_attacks + key + ", "}
					});
					if(best_attacks.length !== 0){best_attacks = "the best moves are: " + best_attacks.slice(0,-2) +" ones, "}
					if(pro_attacks.length !== 0){pro_attacks = "use " + pro_attacks.slice(0,-2) +" moves, "}
					if(weak_attacks.length !== 0){weak_attacks = "don´t use " + weak_attacks.slice(0,-2) +" moves, "}else{pro_attacks = pro_attacks.slice(0,-2)}
					if(shit_attacks.length !== 0){shit_attacks = "do NOT use " + shit_attacks.slice(0,-2) +" moves"}else{weak_attacks = weak_attacks.slice(0,-2)}

					var toReturn = `To beat ${pokemon} ${best_attacks}${pro_attacks}${weak_attacks}${shit_attacks}`
					toReturn = toReturn.capitalizeFirstLetter() //TODO: make more messages // limit: 320 chars
					replyToUserWithImage(reply, profile, pokemon_sprite)
					replyToUser(reply, profile, toReturn)
				}
		    })
			.catch(function (err) {
		        replyToUser(reply, profile, "I can't identify that pokemon :'(")
		        console.log(err)
		    })
		})
	}
}
function getItemInfo(reply, profile, recognizedItems) {
	recognizedItems.forEach(function(item){
		var cachedResult = cache.get(item)
		if(cachedResult !== null){
			returnItemInfo(cachedResult, item)
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/item/'+ item,
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnItemInfo(response, item)
		    })
			.catch(function (err) {
		        replyToUser(reply, profile, "I don´t have any information regarding that object")
		        console.log(err)
		    });
		}
	})
	function returnItemInfo (response, item) {
		cache.put(item, response, CACHE_LIMIT) //one day
		var item_sprite = response.sprites.default
    	var item_description = response.effect_entries[0].effect
    	var held_by = ""
    	if(response.held_by_pokemon.length > 0){
    		response.held_by_pokemon.forEach(function(pokemon){
    			held_by = held_by + pokemon.pokemon.name + ", "
    		})
    		held_by = "Sometimes " + held_by.slice(0, -2) + " can held it."
    	}
    	var arcticle = !!item.slice(0, 1).match(/[aeiouh]/g) ? "an" : "a"
    	toReturn = `${item_description}. Yes, it's ${arcticle} ${item}!\n${held_by}`
		toReturn = beautify(toReturn).replace("\n:", ":")
		replyToUserWithImage(reply, profile, item_sprite)
		replyToUser(reply, profile, toReturn)
	}
}
function getPokemonInfo(reply, profile, pokemon_) {
	var pokemon = pokemon_
	if(pokemon) {
		var cachedResult = cache.get(pokemon)
		if(cachedResult !== null){
			returnPokemonInfo(cachedResult)
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon,
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnPokemonInfo(response)
		    })
			.catch(function (err) {
		        replyToUser(reply, profile, "I can't identify that pokemon :'(")
		        console.log(err)
		    });
		}

		function returnPokemonInfo (response) {
			cache.put(pokemon, response, CACHE_LIMIT) //one day
			var pokemon_types = ""
			response.types.forEach(function(type){pokemon_types = pokemon_types + type.type.name +" "})
			var pokemon_abilities = ""
			response.abilities.forEach(function(ability){pokemon_abilities = pokemon_abilities + ability.ability.name +", "})
			pokemon_abilities = pokemon_abilities.slice(0, -2)
			var pokemon_stats = ""
			response.stats.forEach(function(stat){pokemon_stats = pokemon_stats + beautify(stat.stat.name) + "-> " + stat.base_stat + "\n"})
			var pokemon_sprite = response.sprites.front_default

			var toReturn = `${pokemon} is a ${pokemon_types}pokemon, it could have these abilities: ${pokemon_abilities}.\nThese are its initial stats: ${pokemon_stats}`
			toReturn = toReturn.capitalizeFirstLetter()
			replyToUserWithImage(reply, profile, pokemon_sprite)
			replyToUser(reply, profile, toReturn)
		}
		return true
	}else{return false}
}

function getMoveInfo(reply, profile, move) {
	var move = move.replace(/\s/g, "-")
	var cachedResult = cache.get(move)
	if(cachedResult !== null){
		returnMoveInfo(cachedResult)
		console.log("From cache")
	}else{
		var options = {
		    uri: 'http://pokeapi.co/api/v2/move/'+ move,
		    json: true, // Automatically parses the JSON string in the response 
		    timeout: TIMEOUT_LIMIT
		}
		rp(options)
	    .then(function (response) {
	    	returnMoveInfo(response)
	    })
		.catch(function (err) {
	        replyToUser(reply, profile, "Mmm, I cannot identify that move :'(")
	        console.log(err)
	    });
	}

	function returnMoveInfo (response) {
		cache.put(move, response, CACHE_LIMIT) //one day
		var damage_dealt = response.power === null ? "" : `It deals ${response.power} damage points.`
		var toReturn = `${move} is a ${response.type.name} move.\n${response.effect_entries[0].effect}.\nIt's accuracy is ${response.accuracy}, and the initial PPs are ${response.pp}. ${damage_dealt}`
		toReturn = toReturn.capitalizeFirstLetter()
		replyToUser(reply, profile, toReturn)
	}
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
	return string.replace(/[\-\_]/g, " ");
}
function recognizePokemon(tokens) {
	var pokemon = false
	tokens.forEach(function(token){
		if(pokemons.hasOwnProperty(token)){pokemon = token}
	})
	return !!pokemon ? pokemon : false
}
function recognizieMove(msg) {
	moves.forEach(function(v) {
		if(msg.indexOf(v)>=0){
			return msg.indexOf(v)
		}
		return false
	})
}
function recognize_game_type(text) {
	return sanitize(text)
}
function intersect(a, b) {
	return !!_intersect_(a, b).length 
}
function getGreeting(reply, profile, session) {
	if(!welcomeNewUser(reply, profile, session)){
		replyToUser(reply, profile, "Hello! :|]")
	}
}
function getThank(reply, profile) {
	replyToUser(reply, profile, "You're welcome")
}
function getNotUnderstand(reply, profile, session) {
	if(!welcomeNewUser(reply, profile, session)){
		replyToUser(reply, profile, profile.first_name + ", I didn't catch what you said")
	}
}
function getHelp(reply, profile) {
	replyToUser(reply, profile, `Hi ${profile.first_name}, I'm PokéBot. You can ask me infos about pokemons, where to find a specific pokemon in a specific game, which are the best moves for defeating a pokemon, item infos.\nJust remember that if an item is composed by two words, you must link them. Like old-rod`)
}
function welcomeNewUser(reply, profile, session) {
	if(session.first_user === undefined){
		getHelp(reply, profile)
		session.first_user = false
		return true
	}else{
		return false
	}
}
function getBye(reply, profile) {
	replyToUser(reply, profile, "Byeeee!")
}