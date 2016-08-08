//Retrive functions
var replyToUser = function(reply, profile, answer){
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

var replyToUserWithHints = function(reply, profile, answer, hints, payload){
	if(!!answer) {
		var answerLength = answer.length
		var text = answer.slice(0, 300)
		var quick_replies = hints.map((hint) => {
			return {
				content_type:'text',
		        title:hint,
		        payload:`${payload}_${hint}`
			};
		})
		reply({ text, quick_replies }, (err) => { //need to pass exact name text
			if (err) {console.log(err)}
			try{
				replyToUser(reply, profile, answer.slice(300))
				console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
			}catch(e){console.log(e)}
		})	
	}
}

var replyToUserWithImage = function(reply, profile, imageUrl) {
	var attachment = {"type": "image",
						"payload": {"url": imageUrl}}
	reply({ attachment }, (err) => { //need to pass exact name text
		if (err) {console.log(err)}
		try{
			console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${imageUrl}`)
		}catch(e){console.log(e)}
	})
}

var replyToUserWithAudio = function(reply, profile, audioUrl) {
	var attachment = {"type": "audio",
						"payload": {"url": audioUrl}}
	reply({ attachment }, (err) => { //need to pass exact name text
		if (err) {console.log(err)}
		try{
			console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${audioUrl}`)
		}catch(e){console.log(e)}
	})
}

var replyToUserWithTyping = function(reply, profile, audioUrl) {
	var attachment = {"type": "audio",
						"payload": {"url": audioUrl}}
	reply({ attachment }, (err) => { //need to pass exact name text
		if (err) {console.log(err)}
		try{
			console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${audioUrl}`)
		}catch(e){console.log(e)}
	})
}

module.exports.replyToUser = replyToUser
module.exports.replyToUserWithImage = replyToUserWithImage
module.exports.replyToUserWithAudio = replyToUserWithAudio
module.exports.replyToUserWithHints = replyToUserWithHints
module.exports.replyToUserWithTyping = replyToUserWithTyping