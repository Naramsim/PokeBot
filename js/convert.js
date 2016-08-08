var pokemons = require("../models/pkm.json")
var items = require("../models/items.json")
var games = require("../models/pkm_games.json")
var moves = require("../models/moves.json")
var types = require("../models/types.json")
var abilities = require("../models/abilities.json")

module.exports.toPokemonName = function(id) {
	return pokemons[id - 1];
}
module.exports.toItemName = function(id) {
	return items[id - 1];
}
module.exports.toGameName = function(id) {
	return games[id - 1];
}
module.exports.toMoveName = function(id) {
	return moves[id - 1];
}
module.exports.toTypeName = function(id) {
	return types[id - 1];
}
module.exports.toAbilityName = function(id) {
	return abilities[id - 1];
}

module.exports.toPokemonId = function(name) {
    return pokemons.indexOf(name) + 1;
}
module.exports.toItemId = function(name) {
    return items.indexOf(name) + 1;
}
module.exports.toGameId = function(name) {
    return games.indexOf(name) + 1;
}
module.exports.toMoveId = function(name) {
    return moves.indexOf(name) + 1;
}
module.exports.toTypeId = function(name) {
    return types.indexOf(name) + 1;
}
module.exports.toAbilityId = function(name) {
    return abilities.indexOf(name) + 1;
}