function storeMsg(session, msg) {
	if(typeof(session.latestMessages) === "undefined"){
		session.latestMessages = new Array()
	}
	session.latestMessages.unshift(msg)
}

function isRedundant(session) {
	if(session && session.latestMessages && session.latestMessages.length >= 3) {
		if (session.latestMessages[0] === session.latestMessages[1] && session.latestMessages[1] === session.latestMessages[2]) {
			return true
		}
	}
	return false
}

module.exports.storeMsg = storeMsg
module.exports.isRedundant = isRedundant