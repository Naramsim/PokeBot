const http = require('http')
const Bot = require('messenger-bot')
const express = require('express')
const bodyParser = require('body-parser')

var bot = new Bot({
  token: 'EAAW2de65Vx4BAL0uG2XZBrAQJ014m2uc1NozdhPExcznVus0ZAiGR1FVr7mE7lFWs64ZAnGxFpqSzcIUPJeYWUKXkCvbGn4Uk4VYJgTDilPrB9a9b1rv1WrfnVgEwARuSynck2yQnnyAFLzXDgmBnKEoXrhadX4ifaIorX1kwZDZD',
  verify: 'my_voice_is_my_password_verify_me',
  app_secret: '42d06cc77f08dc8f12cef15985dadd5e'
})

bot.on('error', (err) => {
  console.log(err.message)
})

bot.on('message', (payload, reply) => {
  var text = payload.message.text
  console.log("new message!")
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

// spin spin sugar
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})