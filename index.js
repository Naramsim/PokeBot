// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request 
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_PAGE_ID=your_page_id FB_PAGE_TOKEN=your_page_token FB_VERIFY_TOKEN=verify_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/fb` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const http = require('http');


// When not cloning the `node-wit` repo, replace the `require` like so:
const Wit = require('node-wit').Wit;

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
const WIT_TOKEN = "LOA7BDKDT6IGVK7DQWENUBITNOBOND6O"; //server token

// Messenger API parameters
const FB_PAGE_ID = 1065460476859322;
if (!FB_PAGE_ID) {
	throw new Error('missing FB_PAGE_ID');
}
const FB_PAGE_TOKEN = "EAAW2de65Vx4BAO0ZAcRZCwMyPyMT1Eyoy5tKWZBgMtjcALyjJ9no2dueEfMfSWKv3OqqH08FlXVZBHrcGwRICwR07EBKlDKoUts7vvO4gIJXa7SHZAoNYfCUHZABHON5qZAxCl1jhxB04FTsJVI56w247tecO7CKtyZA97L3Slon8QZDZD";
if (!FB_PAGE_TOKEN) {
	throw new Error('missing FB_PAGE_TOKEN');
}
const FB_VERIFY_TOKEN = "my_voice_is_my_password_verify_me";
console.log("started");

// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference
const fbReq = request.defaults({
	uri: 'https://graph.facebook.com/me/messages',
	method: 'POST',
	json: true,
	qs: { access_token: FB_PAGE_TOKEN },
	headers: {'Content-Type': 'application/json'},
});

const fbMessage = (recipientId, msg, cb) => {
	const opts = {
		form: {
			recipient: {
				id: recipientId,
			},
			message: {
				text: msg,
			},
		},
	};
	fbReq(opts, (err, resp, data) => {
		if (cb) {
			cb(err || data.error && data.error.message, data);
		}
	});
};

// See the Webhook reference
// https://developers.facebook.com/docs/messenger-platform/webhook-reference
const getFirstMessagingEntry = (body) => {
	const val = body.object == 'page' &&
	body.entry &&
	Array.isArray(body.entry) &&
	body.entry.length > 0 &&
	body.entry[0] &&
	body.entry[0].id == FB_PAGE_ID &&
	body.entry[0].messaging &&
	Array.isArray(body.entry[0].messaging) &&
	body.entry[0].messaging.length > 0 &&
	body.entry[0].messaging[0]
	; console.log(body.entry[0].id);
	return val || null;
};

const firstEntityValue = (entities, entity) => {
  const val = entities && entities[entity] &&
    Array.isArray(entities[entity]) &&
    entities[entity].length > 0 &&
    entities[entity][0].value
  ;
  if (!val) {
    return null;
  }
  return typeof val === 'object' ? val.value : val;
};

// Wit.ai bot specific code

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

// Our bot actions
const actions = {
	say(sessionId, context, message, cb) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      fbMessage(recipientId, message, (err, data) => {
      	if (err) {
      		console.log(
      			'Oops! An error occurred while forwarding the response to',
      			recipientId,
      			':',
      			err
      			);
      	}

        // Let's give the wheel back to our bot
        cb();
    });
  } else {
  	console.log('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      cb();
  }
},
merge(sessionId, context, entities, message, cb) {
	const pokemon = firstEntityValue(entities, 'pokemon');
	if (pokemon) {
		context.pokemon = pokemon;
	}
	const pokemon_game_type = firstEntityValue(entities, 'pokemon_game_type');
	if (pokemon_game_type) {
		context.pokemon_game_type = pokemon_game_type;
	}
	cb(context);
},
error(sessionId, context, error) {
	console.log(error.message);
},
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  ['fetch-weather'](sessionId, context, cb) {
    // Here should go the api call, e.g.:
    // context.forecast = apiCall(context.loc)
    context.forecast = 'sunny';
    cb(context);
},
['log-pokemon'](sessionId, context, cb) {
    // Here should go the api call, e.g.:
    // context.forecast = apiCall(context.loc)
    console.log("1"+context.pokemon);
    console.log("2"+sessionId);
    console.log("3"+cb);
    cb(context);
},
['fetch-pokemon-location'](sessionId, context, cb) {
    // Here should go the api call, e.g.:
    // context.forecast = apiCall(context.loc)
    query_location(context, cb);
},
};

// Setting up our bot
const wit = new Wit(WIT_TOKEN, actions);

// Starting our webserver and putting it all together
const app = express();
app.set('port', PORT);
app.listen(app.get('port'));
app.use(bodyParser.json());

// Webhook setup
app.get('/webhook', (req, res) => {
	if (!FB_VERIFY_TOKEN) {
		throw new Error('missing FB_VERIFY_TOKEN');
	}
	if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
		res.send(req.query['hub.challenge']);
	} else {
		res.sendStatus(400);
		console.log("fb auth failed");
	}
});

// Message handler
app.post('/webhook', (req, res) => {
  // Parsing the Messenger API response
  console.log("new message!");
  const messaging = getFirstMessagingEntry(req.body);
  console.log("message decoded: 	");
  if (messaging && messaging.message && messaging.recipient.id === FB_PAGE_ID) {
    // Yay! We got a new message!
    console.log(messaging.message);

    // We retrieve the Facebook user ID of the sender
    const sender = messaging.sender.id;

    // We retrieve the user's current session, or create one if it doesn't exist
    // This is needed for our bot to figure out the conversation history
    const sessionId = findOrCreateSession(sender);

    // We retrieve the message content
    const msg = messaging.message.text;
    const atts = messaging.message.attachments;

    if (atts) {
      // We received an attachment

      // Let's reply with an automatic message
      fbMessage(
      	sender,
      	'Sorry I can only process text messages for now.'
      	);
  } else if (msg) {
      // We received a text message

      // Let's forward the message to the Wit.ai Bot Engine
      // This will run all actions until our bot has nothing left to do
      wit.runActions(
        sessionId, // the user's current session
        msg, // the user's message 
        sessions[sessionId].context, // the user's current session state
        (error, context) => {
        	if (error) {
        		console.log('Oops! Got an error from Wit:', error);
        	} else {
            // Our bot did everything it has to do.
            // Now it's waiting for further messages to proceed.
            console.log('Waiting for futher messages.');

            // Based on the session state, you might want to reset the session.
            // This depends heavily on the business logic of your bot.
            // Example:
            // if (context['done']) {
            //   delete sessions[sessionId];
            // }

            // Updating the user's current session state
            sessions[sessionId].context = context;
        }
    }
    );
  }
}
res.sendStatus(200);
});












//Functions
function query_location(context, cb) {
	var pokemon = sanitize(context.pokemon);
	var game_type = sanitize(context.pokemon_game_type);
	console.log("pokemon: "+pokemon);
	console.log("game type: "+game_type);

	var options = {
		method: 'GET',
		hostname: 'pokeapi.co',
		path: '/api/v2/pokemon/' + pokemon + '/',
		json: true
	};
	var response = "";
	http.get(options, function(resp){
		resp.on('data', function(chunk){
			response += chunk;
		});
		resp.on('end', function(){
			var data = JSON.parse(response);
		    //console.log(data.location_area_encounters[0].location_area.name);
		    locations = {};
		    data.location_area_encounters.forEach(function(area){
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
		    context.pokemon_location = locations[game_type][0];
		    console.log("locations "+context.pokemon_location);
		    cb(context);
		});
	}).on("error", function(e){
		console.log("Got error: " + e.message);
		cb(context);
	});
}

function sanitize(string){
	return string.replace(/\s/g, "").toLowerCase();
}