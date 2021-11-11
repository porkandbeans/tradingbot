interact with my bot at https://steamcommunity.com/id/gokritz_bot

This requires node.js and some packages from the repo.

```
npm install steam-user steam-totp backpacktf steamcommunity steam-tradeoffer-manager
```

Create your own config.json file including your account name used to login to steam, steam password, shared secret and identity secret
(I got mine from the steam-desktop-authenticator for windows using a virtual machine because I'm on Linux, getting it from your phone will be a lot harder)
https://steamauthenticator.com/index.html

your config.json file should look like this:

```
{
    "accountName": "STEAM_ACCOUNT_NAME_HERE",
    "password": "PASSWORD_HERE",
    "shared-secret": "SHARED_SECRET_HERE",
    "identity-secret": "IDENTITY_SECRET_HERE",
    "bptf-api": "BPTF_API_KEY_HERE",
    "my-id": "PERSONAL_STEAM_ACCOUNT_ID_HERE"
}
```