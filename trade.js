const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');
const config = require('./config.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
    steam: client,
    community: community,
    language: 'en'
});

const logOnOptions = {
    accountName: config["accountName"],
    password: config["password"],
    twoFactorCode: SteamTotp.generateAuthCode(config["shared-secret"])
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
    console.log('Logged into Steam');

    client.setPersona(SteamUser.EPersonaState.Online);
    client.gamesPlayed(440);
});

client.on('webSession', (sessionid, cookies) => {
    console.log("WEB SESSION");
    manager.setCookies(cookies);
    community.setCookies(cookies);
    community.startConfirmationChecker(10000, config['identity-secret']);
    console.log("END OF WEB SESSION");
});

manager.on('newOffer', offer => {
    console.log("NEW OFFER!!!!!");
    if (offer.partner.getSteamID64() === config["my-id"]) {
        offer.accept((err, status) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`Accepted offer. Status: ${status}.`);
            }
        });
    } else {
        offer.decline(err => {
            if (err) {
                console.log(err);
            } else {
                console.log('Canceled offer from scammer.');
            }
        });
    }
});