const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')
var _intersect_ = require('intersect')

var replyto = require("./js/reply.js")
var get = require("./js/get.js")
var store = require("./js/store.js")

var location_keywords = ["where", "location", "located"]
var info_keywords = ["info", "infos", "information", "informations", "who"]
var thanks_keywords = ["thanks", "tnx", "ty","(Y)", "thank"]
var beat_keywords = ["beat", "defeat", "rid", "overcome", "counter", "effective"]
var greetings_keywords = ["hello", "hi", "hei", "ola"]
var bye_keywords = ["bye", "see u", "see ya", "see you", "byebye"]
var yes_keywords = ["ok", "yes", "yep", "okok", "alright", "k", "okay", "gg"]
var no_keywords = ["no", "nope", "nono"]
var pokemon_go_keywords = ["pogo", "pokemongo", "pokemon go", "pokestop", "pokemon stop"]
var cry_keywords = ["cry", "sound", "noise", "cries"]
var example_keywords = ["example", "examples"]
var evolve_keywords = ["evolve", "evolution"]
var IV_keywords = ["iv", "cp"]
var pokebot_keywords = ["pokebot", "pokemonbot", "bot", "pokébot", "pokèbot"]
var foreign_keywords = ["comenzar", "spanish", "espanol", "geht"]

try {
    var secret = require("./tokens.json")
    var bot = new Bot({
        token: secret.token,
        verify: secret.verify,
        app_secret: secret.app_secret
    })
} catch (e) {
    var bot = new Bot({
        token: process.env.POKEBOT_TOKEN,
        verify: process.env.POKEBOT_VERIFY,
        app_secret: process.env.POKEBOT_APP_SECRET
    })
}

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

bot.on('postback', (payload, reply) => {
    if (payload) {
        if (payload.postback.payload === 'GET_STARTED') {
            bot.getProfile(payload.sender.id, (err, profile) => {
                if (err) {console.log(err)}
                get.getStarted(reply, profile)
            })
        }
        if (payload.postback.payload === 'EXAMPLES') {
            bot.getProfile(payload.sender.id, (err, profile) => {
                if (err) {console.log(err)}
                get.getExamples(reply, profile)
            })
        }
        if (payload.postback.payload === 'POGO_HELP') {
            bot.getProfile(payload.sender.id, (err, profile) => {
                if (err) {console.log(err)}
                get.getPoGoHelp(reply, profile)
            })
        }
        if (payload.postback.payload === 'HELP') {
            bot.getProfile(payload.sender.id, (err, profile) => {
                if (err) {console.log(err)}
                get.getHelp(reply, profile)
            })
        }
    }
})

bot.on('message', (payload, reply) => {
    console.log("new msg")
    bot.getProfile(payload.sender.id, (err, profile) => {
        if (err) {console.log(err)}
        console.log(payload.message)
        // text message
        if (payload.message && payload.message.text) { 
            bot.setTyping(payload.sender.id, true)

            const sessionId = findOrCreateSession(payload.sender.id)
            var msg = payload.message.text.toLowerCase()
            var session = sessions[sessionId]
            var tokens = payload.message.text.toLowerCase().replace(/[\?\!\.\,\_]/g, ' ').split(' ')

            store.storeMsg(session, msg)

            if(store.isRedundant(session)){replyto.replyToUser(reply, profile, "Ehm...")}else

            if(session.isAnswering === "pokemon_game_type"){get.getPokemonLocation(reply, profile, msg, session)}else // Location

            if(session.isAnswering === "more_info_pokemon"){get.getPokemonMoreInfo(reply, profile, msg, session)}else 
            
            if(intersect(tokens, location_keywords) && !tokens.contains("item")) {get.askWhichGame(reply, profile,  tokens, session)}else // ask game
            
            if(intersect(tokens, beat_keywords)) {get.getPokemonWeakness(reply, profile, tokens)}else // Best move

            if(intersect(tokens, cry_keywords)) {get.getPokemonCry(reply, profile, tokens)}else // Cry

            if(intersect(tokens, evolve_keywords)) {get.getPoGOEvolution(reply, profile, tokens)}else // PoGo evolution

            if(intersect(tokens, IV_keywords)) {get.getPoGOIV(reply, profile, msg, tokens)}else // PoGo IV
            
            if(intersect(tokens, greetings_keywords)) {get.getGreeting(reply, profile, session)}else

            if(intersect(tokens, example_keywords)) {get.getExamples(reply, profile)}else
            
            if(intersect(tokens, thanks_keywords)) {get.getThank(reply, profile)}else

            if(intersect(tokens, foreign_keywords)) {get.getForeignLanguage(reply, profile)}else
            
            if(intersect(tokens, bye_keywords)) {get.getBye(reply, profile)}else

            if(msg === "help pogo" || msg === "Pokemon Go help") {get.getPoGoHelp(reply, profile)}else
            
            if(tokens.contains("help")) {get.getHelp(reply, profile)}else

            if(intersect(tokens, pokemon_go_keywords)) {get.getPoGo(reply, profile)}else
            
            if(intersect(tokens, yes_keywords)) {replyto.replyToUser(reply, profile, "GG")}else
            
            if(intersect(tokens, no_keywords)) {replyto.replyToUser(reply, profile, "Why? :P")}else

            if(intersect(tokens, pokebot_keywords)) {replyto.replyToUser(reply, profile, "Pokebot? It's me!")}else

            {
                var recognizedPokemon = get.recognizePokemon(tokens)
                var recognizedMove = get.recognizeMove(msg)
                var recognizedItem = get.recognizeItem(msg)
                var recognizedAbility = get.recognizeAbility(msg)
                var recognize = get.recognize(tokens)
                var recognizedEmoji = recognize[0]
                var recognizedLaughs = recognize[1]

                if(!!recognizedPokemon) {get.getPokemonInfo(reply, profile, recognizedPokemon, session)}else
                if(!!recognizedMove) {get.getMoveInfo(reply, profile, recognizedMove)}else
                if(!!recognizedItem) {get.getItemInfo(reply, profile, recognizedItem)}else
                if(!!recognizedAbility) {get.getAbilityInfo(reply, profile, recognizedAbility)}else
                if(!!recognizedEmoji) {replyto.replyToUser(reply, profile, recognizedEmoji)}else
                if(!!recognizedLaughs) {replyto.replyToUser(reply, profile, "(Y)")}else
                {get.getNotUnderstand(reply, profile, session)}
            }
        }

        // sticker
        if (payload.message && payload.message.sticker_id) { 
            replyto.replyToUser(reply, profile, "^_^")
        } else

        if (payload.message && payload.message.attachments && payload.message.attachments[0].payload.coordinates) { 
            get.getPoGoNearPokemons(reply, profile, payload.message.attachments[0].payload.coordinates)
        } else

        // attachments

        if (payload.message && payload.message.attachments && !payload.message.sticker_id) {
            replyto.replyToUserWithImage(reply, profile, 'http://mrwgifs.com/wp-content/uploads/2013/11/Happy-Pikachu-Pichu-Pokemon-Running-For-Ash-Ketchum.gif')
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
