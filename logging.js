
const fs = require("fs");
const d = new Date();

logDir = "./logs"
logFile = "logs/" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + ".txt";

function checkLogExists() {

    // does the directory exist? Added this bit after I tried to install the bot on another machine, got an error because the directory didn't exist, going for user-friendliness I guess...
    if (!fs.existsSync(logDir)) {
        console.log('Logs directory does not exist. Making one!');
    
        fs.mkdir(logDir, (err) => {
            if(err){
                console.log("UH-OH! something bad happened. Specifically, I wasn't able to create a logs directory. Try making one, or change some permissions to allow the creation of a new folder.");
                console.log(err);
                process.exit();
            }
        });
    }

    // does a log for today specifically exist?
    if (!fs.existsSync(logFile)) {
        fs.writeFile(
            logFile,
            ("Log created on " + getDateFormatted(true) + "\n"), (err) => {
                if (err) throw err;
                console.log('Log file created.');
            });
        return true;
    } else {
        return false;
    }
}

/**
 * Log that a message has been sent to another user.
 * @param steamid   message recipient
 * @param message   the message itself
 */
function logSend(steamid, message) {
    // write a new log file for today
    if (logFile != "logs/" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + ".txt") {
        logFile = "logs/" + d.getFullYear() + "_" + (d.getMonth() + 1) + "_" + d.getDate() + ".txt";
        checkLogExists(); // because it probably doesn't
    }

    fs.appendFile(
        logFile,
        ("sent: " + getDateFormatted(false) + "[" + steamid + "]" + message + "\n"),
        (err) => {
            if (err) throw err;
            console.log("(me) " + steamid + "-" + message);
        }
    );
}

/**
 * Log that we got a message
 * @param steamid   the account the message came from
 * @param message   the message itself.
 */
function logReceive(steamid, message) {
    fs.appendFile(logFile,
        ("received: " + getDateFormatted(false) + "[" + steamid + "]" + message + "\n"),
        (err) => {
            if (err) throw err;
            console.log(steamid + "-" + message);
        }
    );
}

/**
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

/**
 * Append the log file with a new message.
 * @param comment   the message to append the log file to. Please only pass this as a string.
 */
function append(comment){
    fs.appendFile(logFile, comment, (err) => {
        if (err) throw err;
        console.log(comment);
    })
}

module.exports = {
    checkLogExists,
    logSend,
    logReceive,
    append,
    getDateFormatted
};