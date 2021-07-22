const SteamUser = require('steam-user');
//const SteamTotp = require('steam-totp');
const config = require('./config.json');
const responses = require('./responses.json');

const client = new SteamUser();

const logOnOptions = {
	accountName: config.accountName,
	password: config.password,
	//twoFactorCode: SteamTotp.generateAuthCode('')
};

client.logOn(logOnOptions);

client.on('loggedOn', () => {
	console.log('Bot is now online');

	client.setPersona(SteamUser.EPersonaState.Online);
	client.gamesPlayed(440)
});

client.on('friendRelationship', (steamid, relationship) => {
	if (relationship === 2){
		client.addFriend(steamid);
		client.chatMessage(steamid, "Hello! I am currently unable to trade. Check back soon!");
	}
});

client.on('friendOrChatMessage', (senderID, receivedMessage, room) =>{
    if(receivedMessage.includes("cum")){
        client.chatMessage(senderID, "Oh, I love cum!");
    }

    if(receivedMessage.includes("zerodium")){
        client.chatMessage(senderID, "Sorry, I don't run on PHP.");
    }

    if(receivedMessage == "!rateme"){
        d12 = Math.floor(Math.random() * 12);
        if(d12 >= 6){
            //positive response
			_response = responses.positives[Math.floor(Math.random() * responses.positives.length)];
            client.chatMessage(senderID, _response);
			
        }else{
            //neg the shit out of them
			_response = responses.negatives[Math.floor(Math.random() * responses.negatives.length)];
            client.chatMessage(senderID, _response);
			
        }
    }
});