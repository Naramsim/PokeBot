const http = require('http')
const Bot = require('messenger-bot')

var bot = new Bot({
  token: '1065460476859322',
  verify: 'my_voice_is_my_password_verify_me',
  app_secret: 'EAAW2de65Vx4BAO0ZAcRZCwMyPyMT1Eyoy5tKWZBgMtjcALyjJ9no2dueEfMfSWKv3OqqH08FlXVZBHrcGwRICwR07EBKlDKoUts7vvO4gIJXa7SHZAoNYfCUHZABHON5qZAxCl1jhxB04FTsJVI56w247tecO7CKtyZA97L3Slon8QZDZD'
})

bot.on('error', (err) => {
  console.log(err.message)
})

bot.on('message', (payload, reply) => {
  var text = payload.message.text

  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

    reply({ text }, (err) => {
      if (err) throw err

      console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
    })
  })
})

var app = express()
app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

app.get('/', (req, res) => {
  return bot._verify(req, res)
})

app.post('/', (req, res) => {
  bot._handleMessage(req.body.entry)
  res.end(JSON.stringify({status: 'ok'}))
})

// spin spin sugar
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})