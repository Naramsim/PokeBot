var cache = require('memory-cache')
var rp = require('request-promise')
var replyto = require("./reply.js")
var pokemons = require("../models/pkm.json")
var items = require("../models/items.json")
var games = require("../models/pkm_games.json")
var moves = require("../models/moves.json")
var CACHE_LIMIT = 1000000 * 1000 //11 days
var TIMEOUT_LIMIT = 40000 //40 seconds

function getPokemonLocation(reply, profile, text, session) {
	try{
		session.isAnswering = null
		var pokemon_game_type = recognize_game_type(text)
		var pokemon = session.pokemon
		if(!games.contains(pokemon_game_type)){
			var supported_games = ""
			games.forEach(function(game){supported_games = supported_games + game + ", "})
			supported_games = supported_games.slice(0, -2)
			replyto.replyToUser(reply, profile, `I don't know that game...\nThese are the games that I know: ${supported_games}`)
			return
		}
		
		var cachedResult = cache.get(pokemon)
		if(cachedResult !== null){
			returnLocation(cachedResult, pokemons[pokemon])
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemons[pokemon]+ '/encounters/',
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnLocation(response, pokemons[pokemon])
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "You can't catch this pokemon here")
		        console.log(err)
		    });
		}
	}catch(e){console.log(e)}

    function returnLocation(response, id){
    	cache.put(pokemon, response, CACHE_LIMIT) //one day
    	var pokemon_sprite = `http://veekun.com/dex/media/pokemon/global-link/${id}.png`
		var locations = {}
		if (response instanceof Array) {
			response.forEach(function(array_item){
				//console.log(area.location_area.name + " valid for this games:")
				array_item.version_details.forEach(function(version){
					if(typeof(locations[version.version.name+""]) === "undefined"){
						locations[version.version.name+""] = new Array()
					}
					locations[version.version.name+""].push(array_item.location_area.name)
				})
			})
			//console.log(JSON.stringify(locations))
			if(!locations[pokemon_game_type]){replyto.replyToUser(reply, profile, `Nope, you can't catch it here.\nYou can find it in these games: ${allowedCatchGames(locations)}`);return;}
			var locationsSize = locations[pokemon_game_type].length - 1
			
			if(locationsSize === 0) {replyto.replyToUser(reply, profile, `You can't catch ${pokemon} here`)}
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
			replyto.replyToUserWithImage(reply, profile, pokemon_sprite)
			replyto.replyToUser(reply, profile, toReturn)
		} else {
			replyto.replyToUser(reply, profile, `What are you tring to do?\nYou can't catch ${pokemon} here`)
		}
    }

    function allowedCatchGames(locations) {
    	return Object.keys(locations).join(', ')
    }
}
function getPokemonWeakness(reply, profile, tokens) {
	try{
		var pokemon = recognizePokemon(tokens)
		var cachedResult = cache.get(pokemon)
		if(cachedResult !== null){
			returnWeakness(cachedResult)
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon+'/',
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnWeakness(response)
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "I can't identify that pokemon :'(")
		        console.log(err)
		    })
		}
	}catch(e){console.log(e)}

	function returnWeakness (response) {
		cache.put(pokemon, response, CACHE_LIMIT) //one day
		var pokemon_types = []
		response.types.forEach(function(type){pokemon_types.push(type.type.name)})
		var pokemon_sprite = response.sprites.front_default
		var weakness = {}
		var cycleIndex = 0
		pokemon_types.forEach(function(type){ //for each pokemon type
			var options = {
			    uri: 'http://pokeapi.co/api/v2/type/'+ type+'/',
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
					replyto.replyToUserWithImage(reply, profile, pokemon_sprite)
					replyto.replyToUser(reply, profile, toReturn)
				}
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "I can't identify that pokemon :'(")
		        console.log(err)
		    })
		})
	}
}

function getPokemonCry(reply, profile, tokens) {
	try{
		var pokemon = recognizePokemon(tokens)
		replyto.replyToUserWithAudio(reply, profile, `http://veekun.com/dex/media/pokemon/cries/${pokemons[pokemon]}.ogg`)
	}catch(e){console.log(e)}

	
}

function getItemInfo(reply, profile, recognizedItem) {
	var recognizedItem = recognizedItem.replace(/\s/g, "-")
	try{
		var cachedResult = cache.get(recognizedItem)
		if(cachedResult !== null){
			returnItemInfo(cachedResult, recognizedItem)
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/item/'+ recognizedItem+'/',
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnItemInfo(response, recognizedItem)
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "I don´t have any information regarding that object")
		        console.log(err)
		    });
		}
	}catch(e){console.log(e)}

	function returnItemInfo (response, item) {
		cache.put(item, response, CACHE_LIMIT) //one day
		var item_sprite = "http://veekun.com/dex/media/items/dream-world/"+ item + ".png"
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
		replyto.replyToUser(reply, profile, toReturn)
		replyto.replyToUserWithImage(reply, profile, item_sprite)
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
			    uri: 'http://pokeapi.co/api/v2/pokemon/'+ pokemon+'/',
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnPokemonInfo(response)
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "I can't identify that pokemon :'(")
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
			var pokemon_sprite = "http://veekun.com/dex/media/pokemon/global-link/"+ pokemons[pokemon] + ".png"

			var toReturn = `${pokemon} is a ${pokemon_types}pokemon, it could have these abilities: ${pokemon_abilities}.\nThese are its initial stats: ${pokemon_stats}`
			toReturn = toReturn.capitalizeFirstLetter()
			replyto.replyToUserWithImage(reply, profile, pokemon_sprite)
			replyto.replyToUser(reply, profile, toReturn)
		}
		return true
	}else{return false}
}

function getMoveInfo(reply, profile, move) {
	try{
		var move = move.replace(/\s/g, "-")
		var cachedResult = cache.get(move)
		if(cachedResult !== null){
			returnMoveInfo(cachedResult)
			console.log("From cache")
		}else{
			var options = {
			    uri: 'http://pokeapi.co/api/v2/move/'+ move+'/',
			    json: true, // Automatically parses the JSON string in the response 
			    timeout: TIMEOUT_LIMIT
			}
			rp(options)
		    .then(function (response) {
		    	returnMoveInfo(response)
		    })
			.catch(function (err) {
		        replyto.replyToUser(reply, profile, "Mmm, I cannot identify that move :'(")
		        console.log(err)
		    });
		}
	}catch(e){console.log(e)}

	function returnMoveInfo (response) {
		cache.put(move, response, CACHE_LIMIT) //one day
		var damage_dealt = response.power === null ? "" : `It deals ${response.power} damage points.`
		var toReturn = `${move} is a ${response.type.name} move.\n${response.effect_entries[0].effect}.\nIt's accuracy is ${response.accuracy}, and the initial PPs are ${response.pp}. ${damage_dealt}`
		toReturn = toReturn.capitalizeFirstLetter()
		replyto.replyToUser(reply, profile, toReturn)
	}
}

function askWhichGame(reply, profile, tokens, session) {
	try{
		var pokemon = recognizePokemon(tokens)
		if(pokemon){
			session.isAnswering = "pokemon_game_type"
			session.pokemon = pokemon
			replyto.replyToUserWithHints(reply, profile, "Could you tell me which game are you playing?\nI know every game, not only the one listed below. Those are just examples...", games.slice(0,9), "POKEMON_GAME")
		}else{
			replyto.replyToUser(reply, profile, "I didn't recognize the pokemon.")
		}
	}catch(e){console.log(e)}
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
function recognizeMove(msg) {
	try{
		var move = false
		moves.some(function(v) {
			if(msg.indexOf(v)>=0){
				move = v
				return true
			}
			return false
		})
		return move
	}catch(e){console.log(e)}
}
function recognizeItem(msg) {
	try{
		var item = false
		items.some(function(v) {
			if(msg.indexOf(v)>=0){
				item = v
				return true
			}
			return false
		})
		return item
	}catch(e){console.log(e)}
}
function recognize_game_type(text) {
	return sanitize(text)
}

function getGreeting(reply, profile, session) {
	if(!welcomeNewUser(reply, profile, session)){
		replyto.replyToUser(reply, profile, "Hello!")
	}
}
function getThank(reply, profile) {
	replyto.replyToUser(reply, profile, "You're welcome")
}
function getNotUnderstand(reply, profile, session) {
	if(!welcomeNewUser(reply, profile, session)){
		replyto.replyToUser(reply, profile, profile.first_name + ", I didn't catch what you said")
	}
}
function getStarted(reply, profile) {
	replyto.replyToUser(reply, profile, `Hi ${profile.first_name}, I'm PokéBot. You can ask me infos about pokemons, where to find a specific pokemon in a specific game, which are the best moves for defeating a pokemon, item infos, which are the effects of a move...Just remember to space objects or moves, like super potion.`)
}
function getHelp(reply, profile) {
	replyto.replyToUser(reply, profile, `Hi ${profile.first_name}, I'm PokéBot.\nYou can ask me where is a pokemon, pokemon infos, best moves to defeat a pokemon, effects of a move, items infos, pokemons cries.\nRemember to space objects or moves, like super potion, old rod, mega punch...`)
}
function getExamples(reply, profile) {
	replyto.replyToUserWithHints(reply, profile, "Here are your examples", ["Torkoal info", "Where is geodude?", "Effect of solar beam", "How to beat quilava?", "What is inside tm43", "What's max elixir"], 'EXAMPLE')
}
function welcomeNewUser(reply, profile, session) {
	try{
		if(session.first_user === undefined){
			getHelp(reply, profile)
			session.first_user = false
			return true
		}else{
			return false
		}
	}catch(e){console.log(e)}
}
function getBye(reply, profile) {
	replyto.replyToUser(reply, profile, "Byeeee!")
}
function getPoGo(reply, profile) {
	replyto.replyToUser(reply, profile, "Look a Caterpie! On your right, catch it")
}
function recognize(tokens) {
	var emoji = false
	var laugh = false
	tokens.forEach(function(token){
    	var emojiFound = token.match(/(\:\w+\:|\<[\/\\]?3|[\(\)\\\D|\*\$][\-\^]?[\:\;\=]|[\:\;\=B8][\-\^]?[3DOPp\@\$\*\\\)\(\/\|])(?=\s|[\!\.\?]|$)/g)
    	if(token.match(/(?:[aeiou]*(?:[hj][aeiou]){2,}h?|(?:l+o+)+l+)/g) ){laugh = true}
    	if(emojiFound){emoji = emojiFound[0]}
    })
    return [emoji, laugh]
}

module.exports.getPokemonLocation = getPokemonLocation
module.exports.askWhichGame = askWhichGame
module.exports.getPokemonWeakness = getPokemonWeakness
module.exports.getPokemonCry = getPokemonCry
module.exports.getGreeting = getGreeting
module.exports.getThank = getThank
module.exports.getExamples = getExamples
module.exports.getBye = getBye
module.exports.getPoGo = getPoGo
module.exports.getHelp = getHelp
module.exports.getStarted = getStarted
module.exports.recognizePokemon = recognizePokemon
module.exports.recognizeMove = recognizeMove
module.exports.recognizeItem = recognizeItem
module.exports.getPokemonInfo = getPokemonInfo
module.exports.getMoveInfo = getMoveInfo
module.exports.getItemInfo = getItemInfo
module.exports.getNotUnderstand = getNotUnderstand
module.exports.recognize = recognize