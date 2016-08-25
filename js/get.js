var cache = require('memory-cache')
var rp = require('request-promise')
var ivCalculator = require('pokemon-go-iv-calculator');

var replyto = require('./reply.js')
var convert = require('./convert.js')

var pokemons = require('../models/pkm.json')
var items = require('../models/items.json')
var games = require('../models/pkm_games.json')
var moves = require('../models/moves.json')
var abilities = require('../models/abilities.json')
var pogoMultipliers = require('../models/pogo_multipliers.json')

var CACHE_LIMIT = 1000000 * 1000 //11 days
var TIMEOUT_LIMIT = 40000 //40 seconds

var baseUrl = 'https://cdn.rawgit.com/Naramsim/ninjask/master/data/api/v2'
var endUrl = 'index.json'

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
            returnLocation(cachedResult, convert.toPokemonId(pokemon))
            console.log("From cache")
        }else{
            var options = {
                uri: `${baseUrl}/pokemon/${convert.toPokemonId(pokemon)}/encounters/${endUrl}`,
                json: true, // Automatically parses the JSON string in the response 
                timeout: TIMEOUT_LIMIT
            }
            rp(options)
            .then(function (response) {
                returnLocation(response, convert.toPokemonId(pokemon))
            })
            .catch(function (err) {
                replyto.replyToUser(reply, profile, "You can't catch this pokemon here")
                console.log(err)
            });
        }
    }catch(e){console.log(e)}

    function returnLocation(response, id){
        try {
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
                if(!locations[pokemon_game_type]){replyto.replyToUser(reply, profile, `What are you tring to do?\nYou can't catch ${pokemon} here.\nYou can find it in these games: ${allowedCatchGames(locations)}`);return;}
                var locationsSize = locations[pokemon_game_type].length - 1
                
                if(locationsSize === 0) {
                    if (locations.length > 0) {
                        replyto.replyToUser(reply, profile, `Nope, you can't catch it here.\nYou can find it in these games: ${allowedCatchGames(locations)}`)
                    } else {
                        replyto.replyToUser(reply, profile, `You can't catch ${pokemon} here, and from our researches you can't find a wild one in any games :O`)
                    }
                    
                }
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
                replyto.replyToUser(reply, profile, `Currently lot of people are asking us these kind of information, we will investigate! Try later on.`)
            }
        }catch(e){console.log(e)}
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
                uri: `${baseUrl}/pokemon/${convert.toPokemonId(pokemon)}/${endUrl}`,
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
        try{
            cache.put(pokemon, response, CACHE_LIMIT) //one day
            var pokemon_types = []
            response.types.forEach(function(type){pokemon_types.push(type.type.name)})
            var pokemon_sprite = response.sprites.front_default
            var weakness = {}
            var cycleIndex = 0
            pokemon_types.forEach(function(type){ //for each pokemon type
                var options = {
                    uri: `${baseUrl}/type/${convert.toTypeId(type)}/${endUrl}`,
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
        }catch(e){console.log(e)}
    }
}

function getPokemonCry(reply, profile, tokens) {
    try{
        var pokemon = recognizePokemon(tokens)
        replyto.replyToUserWithAudio(reply, profile, `http://veekun.com/dex/media/pokemon/cries/${convert.toPokemonName(pokemon)}.ogg`)
    }catch(e){console.log(e)}
}

function getPoGOEvolution(reply, profile, tokens) {
    try{
        var pokemon = recognizePokemon(tokens)
        if (pokemon && pogoMultipliers.hasOwnProperty(pokemon)) {
            var cp = tokens.filter((token) => {
                return /\d+/.test(token)
            })
            if (cp && cp.length > 0) {
                var minCP = parseInt(cp[0] * pogoMultipliers[pokemon][0])
                var maxCP = parseInt(cp[0] * pogoMultipliers[pokemon][1])
                replyto.replyToUser(reply, profile, `Your ${pokemon} with ${cp[0]} CP will evolve and have CP varing from ${minCP} and ${maxCP}!`)
            } else {
                replyto.replyToUser(reply, profile, 'Please, write also Pokemon CP, use this syntax: evolve [pokemon] with [tot] CP')
            }
        } else {
            replyto.replyToUser(reply, profile, 'Write: evolve [pokemon] with [tot] CP, and be sure that your Pokemon can evolve')
        }
    }catch(e){console.log(e)}
}

function getPoGOIV(reply, profile, msg, tokens) {
    try{
        var pokemon = recognizePokemon(tokens)
        if (pokemon) {
            var cp = msg.match(/(?:cp[\s-]?)(\d{1,5})/)
            var hp = msg.match(/(?:hp[\s-]?)(\d{1,5})/)
            var dust = msg.match(/(\d{1,5})\s?(?:star)?dust/)
            if (cp && hp && dust) {
                const result = ivCalculator.evaluate(pokemon.charAt(0).toUpperCase() + pokemon.slice(1), cp[1], hp[1], dust[1], true)
                console.log(result)
                var percentage = (result.ivs.map((dict) => {return dict.perfection}).reduce((prev, next)=>{return next + prev}))/result.ivs.length
                if (result && result.ivs.length > 0) {
                    replyto.replyToUser(reply, profile, `Your ${pokemon} has an IV rating equal to ${result.grade.averageGrade.preciseLetter} (${percentage.toFixed(2)}%)`)
                } else {
                    replyto.replyToUser(reply, profile, `Something went wrong, one of the parameter isn't correct`)
                }
            } else {
                replyto.replyToUser(reply, profile, `Are you trying to get ${pokemon} IV? Well, a parameter is missing, use this syntax: calculate IV for [pokemon] with CP [cp], HP [hp] and [current dust upgrade cost] dust`)
            }
        } else {
            replyto.replyToUser(reply, profile, 'IV (Individual Values) are hidden stats that affect how strong your Pokemon is in Gym Battles, beyond the Pokemon\'s CP rating\nTo calculate it type: calculate IV for [pokemon] with CP [cp], HP [hp] and [current dust upgrade cost] dust')
        }
    }catch(e){console.log(e)}
}

function getPoGoNearPokemons (reply, profile, coordinates) {
    try{
        if (coordinates) {
            let urls = [
                ['FastPokeMap', `https://fastpokemap.se/#${coordinates.lat},${coordinates.long}`],
                ['Skiplagged', `https://skiplagged.com/catch-that/#${coordinates.lat},${coordinates.long},14`]
            ]
            replyto.replyToUserWithButtonUrl(reply, profile, 'Click one button below to see your nearest Pokemons', urls)
        } else {
            replyto.replyToUser(reply, profile, 'Mmm..')
        }
    }catch(e){console.log(e)}
}

function getItemInfo(reply, profile, recognizedItem) {
    try{
        var cachedResult = cache.get(recognizedItem)
        if(cachedResult !== null){
            returnItemInfo(cachedResult, recognizedItem)
            console.log("From cache")
        }else{
            var options = {
                uri: `${baseUrl}/item/${convert.toItemId(recognizedItem)}/${endUrl}`,
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
        try {
            cache.put(item, response, CACHE_LIMIT) //one day
            var item_sprite = "http://veekun.com/dex/media/items/dream-world/"+ item + ".png"
            var item_description = response.effect_entries[0].effect
            var item_description_plain = item_description.toLowerCase()
            var inner_moves = []
            var inner_pokemons = []
            var held_by = ""

            moves.forEach((move) => {
                if (item_description_plain.indexOf(` ${move} `) > -1) {
                    if (move.length <= 9) {
                        inner_moves.push(`What ${move} does?`)
                    } else if (move.length <= 12) {
                        inner_moves.push(`${move.capitalizeFirstLetter()} effect`)
                    } else {
                        inner_moves.push(`${move.capitalizeFirstLetter()}`)
                    }
                }
            })
            
            if(response.held_by_pokemon.length > 0){
                response.held_by_pokemon.forEach(function(pokemon){
                    held_by = held_by + pokemon.pokemon.name + ", "
                    inner_pokemons.push(`Who is ${pokemon.pokemon.name}?`)
                })
                held_by = "Sometimes " + held_by.slice(0, -2) + " can held it."
            }
            var arcticle = !!item.slice(0, 1).match(/[aeiouh]/g) ? "an" : "a"
            toReturn = `${item_description}. Yes, it's ${arcticle} ${item}!\n${held_by}`
            toReturn = beautify(toReturn).replace("\n:", ":")
            var merged = inner_pokemons.concat(inner_moves)
            if (merged.length >= 1) {
                merged.push('Thanks')
            }
            if (merged.length >= 2) {
                replyto.replyToUserWithHints(reply, profile, toReturn, merged, 'WAS_INNER')
            } else {
                replyto.replyToUser(reply, profile, toReturn)
                replyto.replyToUserWithImage(reply, profile, item_sprite)
            }
        }catch(e){console.log(e)}
    }
}

function getPokemonInfo(reply, profile, pokemon_) {
    var pokemon = pokemon_
    if(pokemon) {
        try {
            var cachedResult = cache.get(pokemon)
            if(cachedResult !== null){
                returnPokemonInfo(cachedResult)
                console.log("From cache")
            }else{
                var options = {
                    uri: `${baseUrl}/pokemon/${convert.toPokemonId(pokemon)}/${endUrl}`,
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
        }catch(e){console.log(e)}

        function returnPokemonInfo (response) {
            try{
                cache.put(pokemon, response, CACHE_LIMIT) //one day
                var pokemon_types = ""
                response.types.forEach((type) => {
                    pokemon_types = pokemon_types + type.type.name +" "
                })
                var pokemon_abilities = []
                response.abilities.forEach((ability) => {
                    pokemon_abilities.push(ability.ability.name)
                })
                var pokemon_stats = ""
                response.stats.forEach(function(stat){pokemon_stats = pokemon_stats + beautify(stat.stat.name) + "-> " + stat.base_stat + "\n"})
                var pokemon_sprite = "http://veekun.com/dex/media/pokemon/global-link/"+ convert.toPokemonId(pokemon) + ".png"
                var toReturn = `${pokemon} is a ${pokemon_types}pokemon, it could have these abilities: ${pokemon_abilities.join(', ')}.\nThese are its initial stats: ${pokemon_stats}`
                toReturn = toReturn.capitalizeFirstLetter()
                replyto.replyToUserWithImage(reply, profile, pokemon_sprite)
                setTimeout(() => {
                    if (pokemon_abilities.length > 0) {
                        if (pokemon_abilities.length === 1) {
                            pokemon_abilities.push('Thank you')
                        }
                        replyto.replyToUserWithHints(reply, profile, toReturn, pokemon_abilities.map(ability => `What's ${beautify(ability)}?`), 'ABILITY')
                    } else {
                        replyto.replyToUser(reply, profile, toReturn)
                    }
                },2000)
            }catch(e){console.log(e)}
        }
        return true
    }else{return false}
}

function getMoveInfo(reply, profile, move) {
    try{
        var cachedResult = cache.get(move)
        if(cachedResult !== null){
            returnMoveInfo(cachedResult)
            console.log("From cache")
        }else{
            var options = {
                uri: `${baseUrl}/move/${convert.toMoveId(move)}/${endUrl}`,
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
        try {
            cache.put(move, response, CACHE_LIMIT) //one day
            var damage_dealt = response.power === null ? "" : `It deals ${response.power} damage points.`
            var toReturn = `${move} is a ${response.type.name} move.\n${response.effect_entries[0].effect}.\nIt's accuracy is ${response.accuracy}, and the initial PPs are ${response.pp}. ${damage_dealt}`
            toReturn = toReturn.capitalizeFirstLetter()
            replyto.replyToUser(reply, profile, toReturn)
        }catch(e){console.log(e)}
    }
}

function getAbilityInfo(reply, profile, ability) {
    try{
        var cachedResult = cache.get(ability)
        if(cachedResult !== null){
            returnAbilityInfo(cachedResult)
            console.log("From cache")
        }else{
            var options = {
                uri: `${baseUrl}/ability/${convert.toAbilityId(ability)}/${endUrl}`,
                json: true, // Automatically parses the JSON string in the response 
                timeout: TIMEOUT_LIMIT
            }
            rp(options)
            .then(function (response) {
                returnAbilityInfo(response)
            })
            .catch(function (err) {
                replyto.replyToUser(reply, profile, "Mmm, that ability sounds strange to me :'(")
                console.log(err)
            });
        }
    }catch(e){console.log(e)}

    function returnAbilityInfo (response) {
        try {
            cache.put(ability, response, CACHE_LIMIT) //one day
            if (response.effect_entries.length > 0) {
                var toReturn = response.effect_entries[0].effect
                toReturn = toReturn.capitalizeFirstLetter()
                replyto.replyToUser(reply, profile, toReturn)
            } else {
                replyto.replyToUser(reply, profile, 'This ability is so mysterious that I don\'t even know its effects')
            }
        }catch(e){console.log(e)}
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
    try{
        return string.replace(/\s/g, "").toLowerCase();
    }catch(e){console.log(e)}
}

function beautify(string) {
    try{
        return string.replace(/[\-\_]/g, " ");
    }catch(e){console.log(e)}
}

function recognizePokemon(tokens) {
    try{
        var pokemon = false
        tokens.forEach(function(token){
            if (pokemons.indexOf(token) > -1) {
                pokemon = token
            }
        })
        return !!pokemon ? pokemon : false
    }catch(e){console.log(e)}
}
function recognizeMove(msg) {
    try{
        var move = false
        moves.forEach(function(v) {
            if(msg.indexOf(v) >= 0){
                move = v
            }
        })
        return move
    }catch(e){console.log(e)}
}
function recognizeAbility(msg) {
    try{
        var ability = false
        abilities.forEach(function(v) {
            if(msg.indexOf(v) >= 0){
                ability = v
            }
        })
        return ability
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
    try {
        replyto.replyToUser(reply, profile, "You're welcome")
    }catch(e){console.log(e)}
}
function getForeignLanguage(reply, profile) {
    try {
        replyto.replyToUser(reply, profile, "Sorry, I learned only english language at school. Could you please talk to me in english?\nThank you")
    }catch(e){console.log(e)}
}
function getNotUnderstand(reply, profile, session) {
    try {
        if(!welcomeNewUser(reply, profile, session)){
            replyto.replyToUser(reply, profile, profile.first_name + ", I didn't catch what you said")
        }
    }catch(e){console.log(e)}
}
function getStarted(reply, profile) {
    try {
        replyto.replyToUser(reply, profile, `Hi ${profile.first_name}, I'm PokéBot. You can ask me infos about Pokemons, where to find a specific Pokemon in a specific game, which are the best moves for defeating a Pokemon, item infos, which are the effects of a move...Just remember to space objects or moves, like super potion.`)
    }catch(e){console.log(e)}
}
function getHelp(reply, profile) {
    try {
        replyto.replyToUser(reply, profile, `Hi ${profile.first_name}, I'm PokéBot.\nYou can ask me where a Pokemon is, Pokemons info, best moves to defeat a Pokemon, effects of a move, items infos, Pokemons cries, TMs content, berries effects.\nRemember to space objects or moves, like super potion, old rod, mega punch...`)
        setTimeout(() => {
            replyto.replyToUserWithHints(reply, profile, `If you want help with Pokemon Go type: help PoGo`, ['Show some examples', 'Help PoGo', 'Thanks'], 'HELP')
        },1000)
    }catch(e){console.log(e)}
}
function getPoGoHelp(reply, profile) {
    try {
        replyto.replyToUser(reply, profile, `Hi ${profile.first_name}, I can show you the current IV for one of your Pokemon or tell you the CP a Pokemon will have when evolved. Use this syntax:\n • Calculate IV for Raticate cp 328 hp 47 1000 dust(where 1000 is how much dust you need to power it up)\n • Calculate CP after evolution of Geodude with 340 CP`)
        setTimeout(() => {
            replyto.replyToUser(reply, profile, `Additionally I can show you your nearest Pokemons! Just send me your location and I will reply back a map with your Pokemons`)
        },2000)
    }catch(e){console.log(e)}   
}
function getExamples(reply, profile) {
    try {
        replyto.replyToUserWithHints(reply, profile, "Here are your examples", ["Torkoal info", "Where is geodude?", "Effect of solar beam", "How to beat quilava?", "What is inside tm50?", "What is an elixir?","Cheri berry effect"], 'EXAMPLE')
    }catch(e){console.log(e)}
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
    try{
        replyto.replyToUser(reply, profile, "Byeeee!")
    }catch(e){console.log(e)}
}
function getPoGo(reply, profile) {
    try{
        replyto.replyToUser(reply, profile, "Look a Caterpie! On your right, catch it")
    }catch(e){console.log(e)}
}
function recognize(tokens) {
    try {
        var emoji = false
        var laugh = false
        tokens.forEach(function(token){
            var emojiFound = token.match(/(\:\w+\:|\<[\/\\]?3|[\(\)\\\D|\*\$][\-\^]?[\:\;\=]|[\:\;\=B8][\-\^]?[3DOPp\@\$\*\\\)\(\/\|])(?=\s|[\!\.\?]|$)/g)
            if(token.match(/(?:[aeiou]*(?:[hj][aeiou]){2,}h?|(?:l+o+)+l+)/g) ){laugh = true}
            if(emojiFound){emoji = emojiFound[0]}
        })
        return [emoji, laugh]
    }catch(e){console.log(e)}
}

module.exports.getPokemonLocation = getPokemonLocation
module.exports.askWhichGame = askWhichGame
module.exports.getPokemonWeakness = getPokemonWeakness
module.exports.getPokemonCry = getPokemonCry
module.exports.getGreeting = getGreeting
module.exports.getThank = getThank
module.exports.getExamples = getExamples
module.exports.getBye = getBye
module.exports.getForeignLanguage = getForeignLanguage
module.exports.getPoGo = getPoGo
module.exports.getPoGOEvolution = getPoGOEvolution
module.exports.getPoGOIV = getPoGOIV
module.exports.getPoGoNearPokemons = getPoGoNearPokemons
module.exports.getPoGoHelp = getPoGoHelp
module.exports.getHelp = getHelp
module.exports.getStarted = getStarted
module.exports.recognizePokemon = recognizePokemon
module.exports.recognizeMove = recognizeMove
module.exports.recognizeItem = recognizeItem
module.exports.recognizeAbility = recognizeAbility
module.exports.getPokemonInfo = getPokemonInfo
module.exports.getMoveInfo = getMoveInfo
module.exports.getItemInfo = getItemInfo
module.exports.getAbilityInfo = getAbilityInfo
module.exports.getNotUnderstand = getNotUnderstand
module.exports.recognize = recognize 