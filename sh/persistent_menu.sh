curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type" : "call_to_actions",
  "thread_state" : "existing_thread",
  "call_to_actions":[
    {
      "type":"postback",
      "title":"Help",
      "payload":"HELP"
    },
    {
      "type":"web_url",
      "title":"View Website",
      "url":"https://www.facebook.com/PokemonBot"
    }
  ]
}' "https://graph.facebook.com/v2.6/me/thread_settings?access_token=$1"    