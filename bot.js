const SteamUser = require('steam-user'); // used for interfacing with steam
const SteamTotp = require('steam-totp'); // authenticating with steam-guard
const bptf = require('backpacktf'); // check prices on backpack.tf
const fs = require("fs"); // writing _logs
const d = new Date(); // also for writing _logs, pretty much.
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const _community = new SteamCommunity();

var _logs = require("./logging.js");
_logs.checkLogExists();

const _chat = require('./chat.js');

const _config = require('./config.json'); // secrets

const _client = new SteamUser();

const logOnOptions = {
    // _config.json contains confidential information which has been redacted from github
    accountName: _config.accountName,
    password: _config.password,
    twoFactorCode: SteamTotp.generateAuthCode(_config['shared-secret'])
};

const _manager = new TradeOfferManager({
    steam: _client,
    community: _community,
    language: 'en'
});

_client.logOn(logOnOptions);

_client.on('loggedOn', () => {
    console.log('Bot is now online');

    _client.setPersona(SteamUser.EPersonaState.Online); // set status online
    _client.gamesPlayed(440) // set status to playing TF2
});



/**
  sends a message to a user and records it in the logs directory
    @param  message    the message to be sent
    @param  steamID    the user we are sending it to
*/
function sendMessage(steamID, message) {
    _logs.logSend(steamID, message);
    _client.chatMessage(steamID, message);
}

/**
 *  whenever a relationship with a friend changes
    @steamid        the profile which has had a change in relationship
    @relationship   the change made (2 = invite sent)
*/
_client.on('friendRelationship', (steamid, relationship) => {
    if (relationship === 2) {
        // I have been sent a friend request
        _client.addFriend(steamid);
        sendMessage(
            steamid,
            "Hello! I am currently unable to trade. Please check back later."
        );
    }
});

/**
when I get a _chat message
    @senderID           who sent me the message
    @receivedMessage    the message I have received, as a string
    @room               the room where the message was sent (defaults to SteamID if friend message)
*/
_client.on('friendOrChatMessage', (senderID, receivedMessage, room) => {
    // log it
    _logs.logReceive(senderID, receivedMessage);
    response = _chat.checkMessage(receivedMessage);
    if (!isNaN(response)) { // make sure response has been sent back as a number and not a string
        switch (response){
            case 0:
                // !help
                sendMessage(senderID, "!help - shows this help menu");
                sendMessage(senderID, "!rateme - I will give your steam profile a personalised review");

            /*case 1:
                // !update
                //updatePrices(senderID);
                break;
            case 2:
                // !price
                /*item = receivedMessage.substring("!price ".length, receivedMessage.length);
                getPrice(senderID, item);*/

                break;
        }
    }else{
        // either I've already decided what the message is, or I just couldn't parse whatever was sent to me
        if (response != null) {
            sendMessage(senderID, response)
        } else {
            sendMessage(senderID, "I'm sorry. My responses are limited. You must ask the right questions. (try !help)");
        }
    }
});

// === TRADING STUFF ===
_client.on('webSession', (sessionid, cookies) => {
    console.log("web session");
    _community.setCookies(cookies);
    _manager.setCookies(cookies, null, err => {
        if (err) {
            console.log("Failed to obtain API key.");
            console.log(err);
            process.exit();
        }
    });

    _community.startConfirmationChecker(10000, _config['identity-secret']);
});

_manager.on('newOffer', offer => {
    console.log("new offer");
    if (offer.partner.getSteamID64() === _config['my-id']) {
        console.log("received offer...");
        offer.accept((err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`Accepted offer. Status: ${status}.`);
            }
        });
    } else {
        console.log("not master");
    }
});
// === END OF TRADING STUFF ===





/* === DEPRECATED STUFF ===
function getPrice(sender, item){

    bpitem = bptfData.response.items[item];

    if(bpitem != null){

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
    if(senderID == _config['my-id']){
        fs.writeFile("BPTF.json", "", (err) =>{
            if (err) throw err;
            console.log("Nullified BPTF.json");
        })

        bptf.getCommunityPrices(
            _config['bptf-api'],
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
        _logs.append("== PRICES WERE UPDATED ==\n");
        bptfData = require('./BPTF.json');
    }else{
        sendMessage(senderID, "You are not my master!");
    }
}*/