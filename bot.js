const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const config = require('./config.json');
const responses = require('./responses.json');
const client = new SteamUser();
const fs = require("fs");
const d = new Date();
logFile = "logs/" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + ".txt";

if(!fs.existsSync(logFile)){
    // create a log file, if one doesn't exist
    fs.writeFile(
        logFile, 
        ("Log created on " + getDateFormatted(true) + "\n"), (err) => {
            if (err) throw err;
            console.log('Log file created.');
        });
}

/*
    sends a message to a user and records it
    @message    the message to be sent
    @steamID    the user we are sending it to
*/
function sendMessage(steamID, message){
    fs.appendFile(
        logFile, 
        ("sent: " + getDateFormatted(false) + "[" + steamID + "]" + message + "\n"),
        (err) =>{
            if (err) throw err;
            console.log("(me) " + steamID + "-" + message);
        }
    );
    client.chatMessage(steamID, message);
}

function logMessage(steamID, message){
    fs.appendFile(logFile, 
        ("received: " + getDateFormatted(false) + "[" + steamID + "]" + message + "\n"),
        (err) =>{
            if(err) throw err;
            console.log(steamID + "-" + message);
        }
    );
}

/*
    returns the current date, formatted, as a string
    @year       if set to true, the year will be included
*/
function getDateFormatted(year){
    if (year == true){
        returnMe = d.getFullYear() + "/" + 
        (d.getMonth() + 1) + "/" + 
        d.getDate() + "_" + 
        d.getHours() + ":" +
        d.getMinutes();
    }else{
        returnMe = (d.getMonth() + 1) + "/" + 
        d.getDate() + "_" + 
        d.getHours() + ":" +
        d.getMinutes();
    }
    return returnMe;
}

const logOnOptions = {
    // config.json contains confidential information which has been redacted from github
	accountName: config.accountName,
	password: config.password,
	twoFactorCode: SteamTotp.generateAuthCode(config['shared-secret'])
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	console.log('Bot is now online');

	client.setPersona(SteamUser.EPersonaState.Online); // set status online
	client.gamesPlayed(440) // set status to playing TF2
});

/* whenever a relationship with a friend changes
    @steamid        the profile which has had a change in relationship
    @relationship   the change made (2 = invite sent)
*/
client.on('friendRelationship', (steamid, relationship) => {
	if (relationship === 2){
        // I have been sent a friend request
		client.addFriend(steamid);
        sendMessage(
            steamid,
            "Hello! I am currently unable to trade. Please check back later."
        );
	}
});

/* when I get a chat message
    @senderID           who sent me the message
    @receivedMessage    the message I have received, as a string
    @room               the room where the message was sent (defaults to SteamID if friend message)
*/
client.on('friendOrChatMessage', (senderID, receivedMessage, room) =>{
    // log it
    logMessage(senderID, receivedMessage);
    
    // just jokes at this point
    if(receivedMessage.includes("zerodium")){
        sendMessage(
            senderID,
            "Sorry, I don't run on PHP."
        );
    }

    if(receivedMessage == "!rateme"){
        d12 = Math.floor(Math.random() * 12);
        if(d12 >= 6){
            //positive response
			_response = responses.positives[Math.floor(Math.random() * responses.positives.length)];
            sendMessage(senderID, _response);
			
        }else{
            //neg them
            _response = responses.negatives[Math.floor(Math.random() * responses.negatives.length)];
            sendMessage(senderID, _response);
        }
    }
});