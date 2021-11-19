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

const ignoreList = require('./ignoreList.json');

const WEPLOW = 1;
const WEPHIGH = 2;
const SCRAP = 2;
const REC = 6;
const REF = 18;

const CARDLOW = 6;
const CARDHIGH = 8;

var logs = require("./logging.js");
logs.checkLogExists();

const chat = require('./chat.js');

const config = require('./config.json'); // secrets
const { off, send } = require('process');

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
 * log something to the console and to the .txt file
 * @param content   the contents to be logged (could be a string, an object, something PRINTABLE)
 */
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
            "Hello! I am buying/selling ANY and ALL steam trading cards for 0.33/0.44. Send me a trade offer, or if you want to quickly sell all your cards, type \"!sell cards\""
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
                sendMessage(senderID, "!sell cards - I will (QUICKLY) make you an offer to buy all the cards in your inventory for 0.33 metal");
                sendMessage(senderID, "!rateme - I will give your steam profile a personalised review");
                sendMessage(senderID, "!source - view my source code!");
                sendMessage(senderID, "!about - what am I?");
                break;
            case 1:
                //don't actually do anything...
                break;
            case 2:
                // send myself an authentication code for logging in
                sendMessage(config['my-id'], SteamTotp.generateAuthCode(config['shared-secret']));
                break;
            case 3:
                // offer to buy all the user's trading cards
                buyCards(senderID);
                break;
            case 4:
                // dump TF2 inventory contents to admin
                logThis("Dump TF2 request from " + senderID);
                if (senderID.toString() === config['my-id'])
                    dumpInventory(440, 2);
                else
                    sendMessage(senderID, "You are not my master!");
                break;
            case 5:
                // dump STEAM inventory contents to admin
                logThis("Dump STEAM request from " + senderID);
                if (senderID.toString() === config['my-id'])
                    dumpInventory(753, 6);
                else
                    sendMessage(senderID, "You are not my master!");
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

/**
 * Buy all the steam trading cards from partner's inventory
 * @param recipient trade partner
 */
function buyCards(recipient) {
    logThis("now doing a whole lot of stuff to buy cards");
    var myMetal = [];
    var theirCards = [];
    var offer = manager.createOffer(recipient);
    var cardValue;

    // get the inventories
    manager.getUserInventoryContents(recipient, 753, 6, true, (err, inventory, currencies) => {

        if (err) {
            logThis("\n" + err + "\n");
            sendMessage(recipient, "there was an error opening your inventory.");
            return;
        }

        if (inventory.length === 0) {
            sendMessage(recipient, "Uh oh! looks like your inventory is empty...");
            return;
        }

        // add all cards to new array
        inventory.forEach(item => {
            var isACard = false;
            item.tags.forEach(tag => {
                if (tag.name === "Trading Card") {
                    isACard = true;
                }
            });

            if (isACard) {
                theirCards.push(item);
            }
        });

        cardValue = theirCards.length * CARDLOW;
        logThis("They have " + cardValue + " worth in trading cards");
        offer.addTheirItems(theirCards);
    });

    // get the inventories
    manager.getInventoryContents(440, 2, true, (err, inventory, currencies) => {

        if (err) {
            logThis("\n" + err + "\n");
            sendMessage(recipient, "there was an error opening my own inventory.");
            return;
        }

        if (inventory.length === 0) {
            sendMessage(recipient, "Uh oh! looks like my inventory is empty...");
            return;
        }

        var metalValue = 0;
        var escrow = 0;

        // count my total balance
        inventory.forEach(item => {
            if (item.name === "Refined Metal") {
                escrow += REF;
            } else if (item.name === "Reclaimed Metal") {
                escrow += REC;
            } else if (item.name === "Scrap Metal") {
                escrow += SCRAP;
            }
        });

        logThis("My total metal: " + escrow);

        if (escrow >= cardValue) {
            // I have enough money, start counting out change for the cards
            var loopBreak = 0
            while (metalValue < cardValue) {
                loopBreak = metalValue;
                logThis("looping to count change - " + metalValue);
                inventory.forEach(item => {
                    if (metalValue == cardValue) {
                        // exit the foreach
                        return;
                    } else {
                        if (metalValue + REF <= cardValue) {
                            if (item.name === "Refined Metal") {
                                myMetal.push(item);
                                metalValue += REF;
                            }
                        } else if (metalValue + REC <= cardValue) {
                            if (item.name == "Reclaimed Metal") {
                                myMetal.push(item);
                                metalValue += REC;
                            }
                        } else if (metalValue < cardValue) {
                            if (item.name === "Scrap Metal") {
                                myMetal.push(item);
                                metalValue += SCRAP;
                            }
                        }
                    }
                });
                if (loopBreak == metalValue) {
                    logThis("un-stucking self from loop");
                    break;
                }
            }
        } else {
            logThis("I do not have the metal to cover this trade ");
            sendMessage(recipient, "Sorry, but I don't have enough metal to cover this trade! You can make a trade offer yourself if you want?");
            return;
        }
        logThis("I have counted out " + metalValue + " metal");

        if (metalValue === cardValue) {
            // finalize the offer
            offer.addMyItems(myMetal);

            offer.send((err, status) => {
                if (err) {
                    logThis("\n" + err + "\n");
                    return;
                } else if (status === "pending") {
                    community.acceptConfirmationForObject(config['identity-secret'], offer.id, (err) => {
                        if (err) {
                            logThis(err);
                            return;
                        } else {
                            sendMessage(recipient, "I have just sent you an offer.");
                            return;
                        }
                    });
                } else {
                    sendMessage(recipient, "I have just sent you an offer.");
                    return;
                }
            });
        } else {
            // couldn't make an even trade
            sendMessage(recipient, "Sorry, but i wasn't able to count up the metal for all of your cards for whatever reason. From here, you could try making your own trade offer?");
            return;
        }


    });
}

/**
 * send all items from my own inventory to GoKritz
 */
function dumpInventory(game, context) {

    manager.getInventoryContents(game, context, true, (err, inventory, currencies) => {


        if (err) {
            logThis("\n" + err + "\n");
            sendMessage(config['my-id'], "there was an error opening my own inventory.");
            return;
        }

        if (inventory.length === 0) {
            sendMessage(config['my-id'], "Uh oh! looks like my inventory is empty...");
            return;
        }

        var offer = manager.createOffer(config['my-id']);
        offer.addMyItems(inventory); // everything

        offer.send((err, status) => {
            if (err) {
                sendMessage(config['my-id'], "There was an error sending the trade!");
                logThis("\n" + err + "\n");
                return;
            } else if (status === "pending") {
                community.acceptConfirmationForObject(config['identity-secret'], offer.id, (err) => {
                    if (err) {
                        sendMessage(config['my-id'], "error confirming the trade!");
                        logThis(err);
                        return;
                    } else {
                        sendMessage(config['my-id'], "I have just sent you all my items.");
                        return;
                    }
                });
            } else {
                sendMessage(config['my-id'], "I have just sent you all my items.");
                return;
            }
        });

    });
}

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

/**
 * This is fired whenever I am sent a new trade offer
 */
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
        logThis("RECEIVE - id: " + i.id + " name: " + i.name + " contextid: " + i.contextid + " appid: " + i.appid + " tags: " + i.tags);
        i.tags.forEach(tag => {
            logThis("       tag: " + tag.name);
        });
    });
    offer.itemsToGive.forEach(x => {
        logThis("GIVE - id: " + x.id + " name: " + x.name + " contextid: " + x.contextid + " appid: " + x.appid);
        x.tags.forEach(tag => {
            logThis("       tag: " + tag.name);
        });
    });

    processTradeOffer(offer);
});


function processTradeOffer(offer) {
    sender = offer.partner.getSteamID64();

    if (sender === config['my-id']) {
        // I just received an offer from GoKritz and should accept it regardless of the perceived value
        sendMessage(sender, "YES, MY LORD https://vignette.wikia.nocookie.net/p__/images/0/05/Serious_gir_by_sasukex125-d596r5a.png/revision/latest?cb=20170723023234&path-prefix=protagonist");
        acceptTrade(offer, sender);
        return;
    }

    if (offer.itemsToGive.length <= 0) {
        // I'm being offered something for free
        acceptTrade(offer, sender);
        logThis("DONATION FROM " + sender);
        sendMessage(sender, "Thank you for the generous donation! <3");
        return;
    }

    if (offer.itemsToReceive.length > 0) {
        var incomingValue = valueItems(offer.itemsToReceive, false);
        var outgoingValue = valueItems(offer.itemsToGive, true);

        if (incomingValue === false || outgoingValue === false) {
            sendMessage(sender, "I couldn't identify one or more items in the trade! Please be aware I am buying and selling steam trading cards for raw TF2 metal.");
            declineOffer(offer, sender);
            return;
        }

        if (incomingValue == outgoingValue) {
            logThis("==========This trade looks fair==========");
            logThis("incoming: " + incomingValue + " outgoing: " + outgoingValue);
            acceptTrade(offer, sender);
            return;
        } else if (incomingValue < outgoingValue) {
            logThis("==========This looks like a bad trade for me==========");
            logThis("incoming: " + incomingValue + " outgoing: " + outgoingValue);
            sendMessage(sender, "This looks like an unfair trade. I am buying steam trading cards for 0.33 and selling them for 0.44. If you want to quickly sell all your cards, type \"!sell cards\" and I will make you an offer faster than you can say \"two-factor authentication\"!");
            declineOffer(offer, sender);
            return;
        } else {
            logThis("==========This looks unfair in my favour==========");
            logThis("incoming: " + incomingValue + " outgoing: " + outgoingValue);
            if (incomingValue - outgoingValue <= REF) {
                acceptTrade(offer, sender);
                return;
            } else {
                sendMessage(sender, "While I accept unbalanced trades in my favour to some degree, I'm not a monster. That trade would be giving me over 1 refined metal's worth of value that I'm not asking for, and out of morals I cannot accept this in case it was in error. If you want to make a donation, submit a new trade offer where I'm not giving you anything and it will auto-accept.");
                return;
            }

        }
    }
}


/**
 * returns the perceived value of all incoming or outgoing items from a trade offer, or false if any erroneous items are included
 * @param items an array containing the items coming in from a trade offer
 * @param outgoing  is this my trade window, or theirs?
 */
function valueItems(items, outgoing) {
    var tradeValue = 0; // the total value of the trade for this user (either going in or out)

    var anomaly = false; // if this is true at the end of the function, return false and tell the partner that I don't know WTF that is and I'm not doing it

    items.forEach(item => {

        // ignore items from this list
        ignoreList.ignores.forEach(word => {
            if (item.name === word) {
                anomaly = true;
                return;
            }
        });

        if (item.appid == 440) {

            // TF2 Item
            if (item.name === "Scrap Metal") {
                tradeValue += SCRAP;
            } else if (item.name === "Reclaimed Metal") {
                tradeValue += REC;
            } else if (item.name === "Refined Metal") {
                tradeValue += REF;
            } else {
                //var isUnique = false;
                var isWeapon = false;

                ignoreList.weapons.forEach(name => {
                    if (item.name === name) {
                        isWeapon = true;
                        if (outgoing) {
                            tradeValue += WEPHIGH;
                        } else {
                            tradeValue += WEPLOW;
                        }
                        return; // out of the forEach
                    }
                });

                if (!isWeapon) {
                    // I don't know what this item is, I don't have a value for it.
                    anomaly = true;
                    return;
                }
            }
        } else if (item.appid == 753) {
            // Steam item
            var isACard = false;
            item.tags.forEach(tag => {
                if (tag.name === "Trading Card") {
                    isACard = true;
                }
            });
            if (isACard) {
                if (outgoing) {
                    tradeValue += CARDHIGH;
                } else {
                    tradeValue += CARDLOW;
                }

            } else {
                // I don't know what this item is, I don't have a value for it.
                anomaly = true;
                return;
            }
        } else {
            // I don't know what this item is, I don't have a value for it.
            anomaly = true;
            return;
        }
    });
    if (anomaly) {
        return false;
    } else {
        return tradeValue;
    }
}

function errorResponse(sender, err) {
    logThis(err);
    sendMessage(sender, "There was an error. It could be nothing, but if you are having problems, contact GoKritz: ");
    sendMessage(sender, "https://steamcommunity.com/id/Voter96/");
}

function acceptTrade(offer, sender) {
    offer.accept((err, status) => {
        if (err) {
            errorResponse(sender, err);
        } else {
            logThis("Trade offer accepted from " + sender);
            sendMessage(sender, "Donezo! Offer accepted.");
        }
    });
}

function declineOffer(offer, sender) {
    offer.decline(err => {
        if (err) {
            logs.append("Error declining tradeoffer: " + err);
            console.log("Error declining Tradeoffer: " + err);
            sendMessage(sender, "I tried to decline your offer, but then an error happened. You may want to cancel it. Sorry about that...");
        } else {
            logThis("Declined offer from " + sender);
            sendMessage(sender, "I have declined the offer.");
        }
    });
}