curl -X POST -H "Content-Type: application/json" -d '{
  "setting_type":"call_to_actions",
  "thread_state":"new_thread",
  "call_to_actions":[
    {
      "message":{
        "text":"Zzz.."
      }
    }
  ]
}' "https://graph.facebook.com/v2.6/1065460476859322/thread_settings?access_token=EAAW2de65Vx4BAElBWLhFTKAFjvVojai1hSwZAi2YiS0CZBnGWwxgVMqg7ngYc0Iq6q4MPK2NSauZAPREQTnmAk5xLEExXJSBH02jMO2WAa59HNCMGF2RFFdGXeg26maejwVxI1ZAiZCljBlhuDNWmSrXBkBL3dIkZBivNEO9MEzgZDZD"