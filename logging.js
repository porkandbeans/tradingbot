
const fs = require("fs");
const d = new Date();

logFile = "logs/" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + ".txt";

function checkLogExists() {
    if (!fs.existsSync(logFile)) {
        fs.writeFile(
            logFile,
            ("Log created on " + getDateFormatted(true) + "\n"), (err) => {
                if (err) throw err;
                console.log('Log file created.');
            });
        return true;
    } else {
        console.log('did not make a file');
        return false;
    }
}

function logSend(steamid, message) {
    fs.appendFile(
        logFile,
        ("sent: " + getDateFormatted(false) + "[" + steamid + "]" + message + "\n"),
        (err) => {
            if (err) throw err;
            console.log("(me) " + steamid + "-" + message);
        }
    );
}

function logReceive(steamid, message) {
    fs.appendFile(logFile,
        ("received: " + getDateFormatted(false) + "[" + steamid + "]" + message + "\n"),
        (err) => {
            if (err) throw err;
            console.log(steamid + "-" + message);
        }
    );
}

/*
    returns the current date, formatted, as a string
    @year       if set to true, the year will be included
*/
function getDateFormatted(year) {
    if (year == true) {
        returnMe = d.getFullYear() + "/" +
            (d.getMonth() + 1) + "/" +
            d.getDate() + "_" +
            d.getHours() + ":" +
            d.getMinutes();
    } else {
        returnMe = (d.getMonth() + 1) + "/" +
            d.getDate() + "_" +
            d.getHours() + ":" +
            d.getMinutes();
    }
    return returnMe;
}

module.exports = {
    checkLogExists,
    logSend,
    logReceive
};