const SteamUser = require('steam-user'); // used for interfacing with steam
const SteamTotp = require('steam-totp'); // authenticating with steam-guard
const bptf = require('backpacktf'); // check prices on backpack.tf
const fs = require("fs"); // writing logs
const d = new Date(); // also for writing logs, pretty much.
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

var logs = require("./logging.js");
logs.checkLogExists();

const chat = require('./chat.js');

const config = require('./config.json'); // secrets

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

// === TRADING STUFF ===
client.on('webSession', (sessionid, cookies) => {
    console.log("web session");
    community.setCookies(cookies);
    manager.setCookies(cookies, null, err => {
        if (err) {
            console.log("Failed to obtain API key.");
            console.log(err);
            process.exit();
        }
    });

    community.startConfirmationChecker(10000, config['identity-secret']);
});

manager.on('newOffer', offer => {
    console.log("new offer");
    if (offer.partner.getSteamID64() === config['my-id']) {
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


/**
  sends a message to a user and records it in the logs directory
    @param  message    the message to be sent
    @param  steamID    the user we are sending it to
*/
function sendMessage(steamID, message) {
    logs.logSend(steamID, message);
    client.chatMessage(steamID, message);
}

function logThis(content) {
    logs.append(content + "\n");
    console.log(content);
}

/**
 *  whenever a relationship with a friend changes
    @steamid        the profile which has had a change in relationship
    @relationship   the change made (2 = invite sent)
*/
client.on('friendRelationship', (steamid, relationship) => {
    if (relationship === 2) {
        // I have been sent a friend request
        client.addFriend(steamid);
        sendMessage(
            steamid,
            "Hello! We're friends now. YAY! I am currently buying all steam trading cards for .33 TF2 metal per card. Send me a trade offer and I will instantly accept!"
        );
    }
});

/**
when I get a chat message
    @senderID           who sent me the message
    @receivedMessage    the message I have received, as a string
    @room               the room where the message was sent (defaults to SteamID if friend message)
*/
client.on('friendOrChatMessage', (senderID, receivedMessage, room) => {
    // log it
    logs.logReceive(senderID, receivedMessage);
    response = chat.checkMessage(receivedMessage);
    if (!isNaN(response)) { // make sure response has been sent back as a number and not a string
        switch (response){
            case 0:
                // !help
                sendMessage(senderID, "!help - shows this help menu");
                sendMessage(senderID, "!rateme - I will give your steam profile a personalised review");
                sendMessage(senderID, "!source - view my source code!");
                sendMessage(senderID, "!about - what am I?");
                break;
            case 1:
                //don't actually do anything...
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
client.on('webSession', (sessionid, cookies) => {
    console.log("web session");
    community.setCookies(cookies);
    manager.setCookies(cookies, null, err => {
        if (err) {
            console.log("Failed to obtain API key.");
            console.log(err);
            process.exit();
        }
    });

    community.startConfirmationChecker(10000, config['identity-secret']);
});

manager.on('newOffer', offer => {

    // TRADING CARD PROPERTIES TO LOOK FOR
    // item.appid = 753
    // tag.name = "Trading Card"

    // TF2 ITEM PROPERTIES TO LOOK FOR
    // item.appid = 440
    // item.name = "Reclaimed Metal", "Refined Metal", "Scrap Metal"

    logThis("NEW OFFER FIRED AT " + logs.getDateFormatted(true) + "\n");
    logThis("PARTNER: " + offer.partner.getSteamID64() + "\n");

    offer.itemsToReceive.forEach(i => {
        logThis("RECEIVE - id: " + i.id + " name: " + i.name + " contextid: " + i.contextid + " appid: " + i.appid + "\n");
    });
    offer.itemsToGive.forEach(x => {
        logThis("GIVE - id: " + x.id + " name: " + x.name + " contextid: " + x.contextid + " appid: " + x.appid + "\n");
    });

    processTradeOffer(offer);
});


function processTradeOffer(offer) {
    sender = offer.partner.getSteamID64();

    if (offer.itemsToGive.length <= 0) {
        // I'm being offered something for free
        acceptTrade(offer, sender);
        logThis("DONATION FROM " + sender);
        offer.itemsToReceive.forEach(item => {
            logThis(item.name);
        });
        sendMessage(sender, "Thank you for the generous donation! <3");
        return;
    }

    if (offer.itemsToReceive.length > 0) {
        if (lookForCards(offer)) {
            if (countChange(offer)) {
                // the value of the trade consists of me receiving cards and paying .33 for each of them
                acceptTrade(offer, sender);
            } else {
                // the trade is unfairly valued

                if (sender === config['my-id']) {
                    // I just received an offer from GoKritz and should accept it regardless of the perceived value
                    sendMessage(sender, "That offer looks terrible, but I'm accepting this in the hopes you don't de-activate me again.");
                    acceptTrade(offer, sender);
                    return;
                }

                sendMessage(sender, "That looks like an unfair trade to my inferior robot eyes. Please make sure you are only trying to sell me your Steam trading cards for RAW 0.33 metal each (this might also be happening because you are overpaying. I accept donations!)");
                offer.decline(err => {
                    if (err) {
                        logs.append("Error declining tradeoffer: " + err);
                        console.log("Error declining Tradeoffer: " + err);
                        sendMessage(sender, "I tried to decline your offer, but then an error happened. You may want to cancel it. Sorry about that...");
                    } else {
                        logThis("Declined offer from " + sender);
                    }
                });
            }
        }

    }
}

function lookForCards(offer) {
    offer.itemsToReceive.forEach(item => {
        // does this belong to the steam app?
        if (item.appid === 753) {

            var isAcard = false;
            item.tags.forEach(tag => {
                if (tag.name == "Trading Card") {
                    // return true if one of the tags on this item is "Trading Card"
                    isAcard = true;
                }
            });

            if (!isAcard) {
                // return false if we get through the whole array of tags without finding one named "trading card"
                return false;
            }
        } else {
            // this isn't a steam item
            return false;
        }
    });
    return true;
}

function countChange(offer) {

    var value = offer.itemsToReceive.length * 0.333333;
    if (value === lookForMetal(offer.itemsToGive)) {
        logThis("My given value: " + lookForMetal(offer.itemsToGive));
        logThis("Received value: " + offer.itemsToReceive.length * 0.333333);
        return true;
    } else {
        return false;
    }
}

function lookForMetal(itemsGive) {
    var value = 0;
    itemsGive.forEach(item => {
        // this is an item from TF2, right?
        if (item.appid === 440) {
            if (item.name === "Scrap Metal") {
                value += 0.111111;
            } else if (item.name === "Reclaimed Metal") {
                value += 0.333333;
            } else if (item.name === "Refined Metal") {
                value += 0.999999;
            } else {
                // it's not metal
                return false;
            }
        }
    });
    return value;
}

function errorResponse(sender) {
    logThis(err);
    sendMessage(sender, "error... Here's a couple things you can try:");
    sendMessage(sender, "Cancel your offer and try again");
    sendMessage(sender, "Wait a few minutes");
    sendMessage(sender, "contact my dev: https://steamcommunity.com/id/Voter96/");
}

function acceptTrade(offer, sender) {
    offer.accept((err, status) => {
        if (err) {
            errorResponse(sender);
        } else {
            logThis("Trade offer accepted from " + sender);
            sendMessage(sender, "Donezo! Offer accepted.");
        }
    });
}