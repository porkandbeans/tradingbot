const SteamUser = require('steam-user')
const client = new SteamUser();

const responses = require('./responses.json');
const inputs = require('./inputs.json');
const logs = require('./logging.js');


function checkMessage(message){
    message = message.toLowerCase(); // lower-case the string so as not to confuse the robot's tiny mind

    
    if(message.startsWith("!help")){
        return 0;
    }

    if(message.startsWith("[tradeoffer")){
        return 1;
    }

    if(message == "good robot"){
        return "<3";
    }

    // past this point, it's all nonsense.
    
    for(i = 0; i < inputs.greetings.length; i++){
        if(message == inputs.greetings[i]){
            return "Hm? Oh. Hi, I guess. Sorry, I'm a robot and I don't really know how to talk to people. I'm really only good for trading. If you type !help you can see the important commands that make me do stuff.";
        }
    }

    if (message.includes("zerodium")) {
        return "Sorry, I wasn't built with PHP."
    } 

    if (message == "!rateme") {
        return rateUser()
    }
    
    if (message.includes("why")){
        if(
            message.includes("exist") || 
            message.includes("life")){
            return "It sounds like you're asking me a philosophical question about life! Sorry, but I'm not built for that. I'll buy your trading cards though?";
        }

        if (message.includes("hard", "penis", "sexy", "sex", "hot")) {
            return "I'm not sure I like this question.";
        }

        if(message == "why"){
            return "Why what?";
        }
    
        return "Sorry, I don't understand the question."
    }
}

// returns a string containing the response
function rateUser(){
    d12 = Math.floor(Math.random() * 12);
    if (d12 >= 6) {
        //positive response
        _response = responses.positives[Math.floor(Math.random() * responses.positives.length)];
        return _response;

    } else {
        //neg them
        _response = responses.negatives[Math.floor(Math.random() * responses.negatives.length)];
        return _response;
    }
}


module.exports = {
    checkMessage
}