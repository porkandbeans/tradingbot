const SteamUser = require('steam-user')
const client = new SteamUser();

const responses = require('./responses.json');
const inputs = require('./inputs.json');
const logs = require('./logging.js');


/**
 * 
 * @param message the message to check
 * @returns either an int, or a full-blown response as a string
 */
function checkMessage(message){
    message = message.toLowerCase(); // lower-case the string so as not to confuse the robot's tiny mind
    
    if(message.startsWith("!help")){
        return 0;
    }

    if (message.startsWith("[tradeoffer ")) {
        return 1;
    }

    if (message.startsWith("!source")) {
        return "I am open source. View my source code at https://github.com/porkandbeans/tradingbot";
    }

    if (message.startsWith("!about")) {
        return "I am a trading robot. I was built by GoKritz (https://steamcommunity.com/id/Voter96/). At some point in the near future, I will have a website. For now, I am going to be accepting trading cards for .33 and selling them for .44. Hopefully, you will be able to buy and sell TF2/CS:GO/Dota2 items from me using Monero - a privacy-focused cryptocurrency with miniscule transaction fees. This is why I exist. GoKritz wanted to buy TF2 keys for Monero, but there were no vendors. So he made one. Me.";
    }

    if (message.startsWith("!auth")) {
        return 2;
    }

    if (message.startsWith("!sell cards")) {
        return 3;
    }

    if (message.startsWith("!dumptf2")) {
        return 4;
    }

    if (message.startsWith("!dumpsteam")) {
        return 5;
    }

    if (message.startsWith("!sell keys ")){
        var keyNum = message.substr(10, message.length - 1);
        return ("$buy" + keyNum);
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

/**
 * 
 * @returns string containing a randomly-chosen positive or negative review for the user
 */
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