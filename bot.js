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
            "Hello! I am not currently open for trading. Please check back later."
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
    processTradeOffer(offer);
});


function processTradeOffer(offer){
    console.log("new offer");
    logs.append("Trade offer received from " + offer.partner.getSteamID64() + "\n");
    sender = offer.partner.getSteamID64();
    if (sender === config['my-id']) {
        // received trade offer from admin
        sendMessage(sender, "Oh, hi boss. I'm about to accept the offer.");
        offer.accept((err, status) => {
            if (err) {
                logs.append("error accepting offer from admin: " + err);
                console.log(err);
            } else {
                logs.append("Trade offer accepted from " + offer.partner.getSteamID64());
                console.log(`Accepted offer. Status: ${status}.`);
                sendMessage(sender, "Donezo! Offer accepted.");
            }
        });
    } else if (offer.itemsToGive.length === 0) {
        // accept the donation
        offer.accept((err, status) => {
            if (err) {
                logs.append("Error accepting donation: " + err);
                console.log("Error accepting donation: " + err);
                sendMessage(sender, "Uh-oh! there was an error accepting your donation. Sorry about this... If it persists, please contact GoKritz https://steamcommunity.com/id/Voter96/");
            } else {
                logs.append("Accepted a donation from " + sender + "\n");
                sendMessage(sender, "Thank you for the donation! <3");
            }
        });
    } else {
        // they want our stuff
        offer.decline(err => {
            if (err) {
                logs.append("Error declining tradeoffer: " + err);
                console.log("Error declining Tradeoffer: " + err);
                sendMessage(sender, "I tried to decline your offer, but then an error happened. You may want to cancel it. Please contact GoKritz https://steamcommunity.com/id/Voter96/");
            } else {
                logs.append("declined offer where items would be removed from the inventory from " + sender);
                sendMessage(sender, "Sorry, I am currently in development and not yet ready to be making trades with strangers. Your offer was declined. Check back later though!");
            }
        })
    }
}
// === END OF TRADING STUFF ===