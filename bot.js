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

/* whenever a relationship with a friend changes
    @steamid        the profile which has had a change in relationship
    @relationship   the change made (2 = invite sent)
*/
client.on('friendRelationship', (steamid, relationship) => {
	if (relationship === 2){
        // I have been sent a friend request
		client.addFriend(steamid);
		client.chatMessage(steamid, "Hello! I am currently unable to trade. Check back soon!");
	}
});

/* when I get a chat message
    @senderID           who sent me the message
    @receivedMessage    the message I have received, as a string
    @room               the room where the message was sent (defaults to SteamID if friend message)
*/
client.on('friendOrChatMessage', (senderID, receivedMessage, room) =>{
    // just jokes at this point
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
            //neg them
			_response = responses.negatives[Math.floor(Math.random() * responses.negatives.length)];
            client.chatMessage(senderID, _response);
			
        }
    }
});