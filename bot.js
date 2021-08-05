const SteamUser = require('steam-user'); // used for interfacing with steam
const SteamTotp = require('steam-totp'); // authenticating with steam-guard
const bptf = require('backpacktf'); // check prices on backpack.tf
const fs = require("fs"); // writing logs
const d = new Date(); // also for writing logs, pretty much.

var logs = require("./logging.js");
logs.checkLogExists();

const chat = require('./chat.js');

const config = require('./config.json'); // secrets

const client = new SteamUser();

const logOnOptions = {
    // config.json contains confidential information which has been redacted from github
    accountName: config.accountName,
    password: config.password,
    twoFactorCode: SteamTotp.generateAuthCode(config['shared-secret'])
};

client.logOn(logOnOptions);

var bptfData = require('./BPTF.json');

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

/*  sends a message to a user and records it
    @message    the message to be sent
    @steamID    the user we are sending it to
*/
function sendMessage(steamID, message) {
    logs.logSend(steamID, message);
    client.chatMessage(steamID, message);
}

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

/* 
when I get a chat message
    @senderID           who sent me the message
    @receivedMessage    the message I have received, as a string
    @room               the room where the message was sent (defaults to SteamID if friend message)
*/
client.on('friendOrChatMessage', (senderID, receivedMessage, room) => {
    // log it
    logs.logReceive(senderID, receivedMessage);
    response = chat.checkMessage(receivedMessage);
    if(response != null){
        switch (response){
            case 0:
                // !help
                sendMessage(senderID, "!help - shows this help menu");
                sendMessage(senderID, "!rateme - I will give your steam profile a personalised review");
                sendMessage(senderID, "!price [ITEM NAME] - check the backpack.tf price of an item (replace [ITEM NAME] with the name of the item you want to check)");
            case 1:
                // !update
                updatePrices(senderID);
                break;
            case 2:
                // !price
                item = receivedMessage.substring("!price ".length, receivedMessage.length);
                getPrice(senderID, item);
                break;
            default:
                // response already defined
                sendMessage(senderID, response)
        }
    }else{
        // if the function returned without a value
        sendMessage(senderID, "I'm sorry. My responses are limited. You must ask the right questions. (try !help)");
    }
});

function getPrice(sender, item){

    bpitem = bptfData.response.items[item];

    if(bpitem != null){

        /*
        This doesn't work yet.

        There's so much data in a vague and hard to understand format
        spat out by this backpack.tf module that
        I'm beginning to wonder if it's even worth utilising at this point

        probably not

        probably gonna delete this function altogether

        oh well! pushing to github.
        */

        sendMessage(sender, "I found the item!");
        sendMessage(sender, "A regular " + item + " is worth " + 
            bpitem.prices[6].value +" "+ bpitem.prices[6].currency);
        
        console.log(bpitem.prices[6].value + " and " + bpitem.prices[6].currency)
    }else{
        sendMessage(sender, "Sorry, but I couldn't find the item. You can ask me again though? (capital letters matter!)");
    }
}

function updatePrices(senderID){
    // when called, this gets a shitload (224,152 lines) of data from backpack.tf
    // and stores it in BPTF.json
    // if BPTF.json already exists, it overwrites
    // (hence being !update and not !get)
    // I also made it only listen for this command from me, since
    // it could be abused to spam the API or guzzle up my memory
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
        logs.append("== PRICES WERE UPDATED ==\n");
        bptfData = require('./BPTF.json');
    }else{
        sendMessage(senderID, "You are not my master!");
    }
}