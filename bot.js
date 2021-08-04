const SteamUser = require('steam-user'); // used for interfacing with steam
const SteamTotp = require('steam-totp'); // authenticating with steam-guard
const bptf = require('backpacktf'); // check prices on backpack.tf
const fs = require("fs"); // writing logs
const d = new Date(); // also for writing logs, pretty much.

var logs = require("./logging.js");
logs.checkLogExists();

const config = require('./config.json'); // secrets
const responses = require('./responses.json'); // playing with code...

const client = new SteamUser();

/*  sends a message to a user and records it
    @message    the message to be sent
    @steamID    the user we are sending it to
*/
function sendMessage(steamID, message) {
    logs.logSend(steamID, message);
    client.chatMessage(steamID, message);
}

const logOnOptions = {
    // config.json contains confidential information which has been redacted from github
    accountName: config.accountName,
    password: config.password,
    twoFactorCode: SteamTotp.generateAuthCode(config['shared-secret'])
};

client.logOn(logOnOptions);

var bptfData;

client.on('loggedOn', () => {
    console.log('Bot is now online');

    client.setPersona(SteamUser.EPersonaState.Online); // set status online
    client.gamesPlayed(440) // set status to playing TF2

    /*bptfData = Bptf.getCommunityPrices(config['bptf-api'], "440", (err, data) => {
        if (err) {
            console.log("Error: " + err.message);
        }
    })*/
});

/* whenever a relationship with a friend changes
    @steamid        the profile which has had a change in relationship
    @relationship   the change made (2 = invite sent)
*/
client.on('friendRelationship', (steamid, relationship) => {
    if (relationship === 2) {
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
client.on('friendOrChatMessage', (senderID, receivedMessage, room) => {
    // log it
    logs.logReceive(senderID, receivedMessage);

    // just jokes at this point
    if (receivedMessage.includes("zerodium")) {
        sendMessage(
            senderID,
            "Sorry, I don't run on PHP."
        );
        return;
    }

    // if the user asks to be rated, the bot will berate or compliment them based on a 50/50 dice roll and pull responses from responses.json
    // no, this doesn't need to exist, well spotted.
    if (receivedMessage == "!rateme") {
        d12 = Math.floor(Math.random() * 12);
        if (d12 >= 6) {
            //positive response
            _response = responses.positives[Math.floor(Math.random() * responses.positives.length)];
            sendMessage(senderID, _response);

        } else {
            //neg them
            _response = responses.negatives[Math.floor(Math.random() * responses.negatives.length)];
            sendMessage(senderID, _response);
        }
        return;
    }

    // when called, this gets a shitload (224,152 lines) of data from backpack.tf
    // and stores it in BPTF.json
    // if BPTF.json already exists, it overwrites
    // (hence being !update and not !get)
    // I also made it only listen for this command from me, since
    // it could be abused to spam the API or guzzle up my memory
    if(receivedMessage == "!update"){
        if(senderID == config['my-id']){
            fs.writeFile("BPTF.json", "", (err) =>{
                if (err) throw err;
                console.log("Nullified BPTF.json");
            })

            bptf.getCommunityPrices(
                config['bptf-api'],
                "440",
                (err, data) => {
                    if(err) throw err;
                    fs.writeFile(
                        "BPTF.json",
                        JSON.stringify(data, null, 1),
                        (err) => {
                            if (err) throw err;
                            console.log("file written");
                        })
                })
            sendMessage(senderID, "updated my prices.");
        }else{
            sendMessage(senderID, "You are not my master!");
        }
    }
});