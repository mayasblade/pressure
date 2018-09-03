
var targetTime = false;

var isPressed = false;

var startTime = new Date().getTime() / 1000;

var started = false;

var secondsOff = 0;

var secondsOn = 0;

var secondsSinceLastOff = 0;

var rampInterval = 5;

var callBackUrl = false;


/**
 * If a callBackUrl has been set, this sends status information to it on each loop of the main interval
 *
 * This functionality is added to make it easier to add 3rd party integrations.
 *
 * @param callBackUrl string URL to send status updates
 */
function doCallBack(callBackUrl, data)
{

    $.ajax({
        type : "post",
        url : callBackUrl,
        dataType : "jsonp",
        data: data,
        success : function(data){
            console.error(e);
        },
        error:function(e){
            console.error(e);
        }
    });

}


$(document).ready(function () {
    $('#press').bind("mousedown touchstart", function (e) {
        isPressed = true;

        if (started == false) {
            started = true;
        }
    });

    $('#press').bind("mouseup touchend", function (e) {
        isPressed = false;
    });

    // Query lovense LAN API for any local toys connected
    getToys();

    /**
     * MAIN LOOP
     *
     * Checks every .5 seconds if the user is still pressing the button
     * 	- Original timing was .25, but on Galaxy S6 this was too sensitive
     *
     *
     */
    var interval = setInterval(function () {

        var currentTime = new Date().getTime() / 1000;

        if ( $('input[name="callBackUrl"]').val().length > 0) {
            callBackUrl = $('input[name="callBackUrl"]').val();
        }

        if (started && targetTime == false)
        {
            var minutes = $('input[name="minutes"]').val();

            targetTime = startTime + (minutes * 60);
        }

        if (started && targetTime !== false && currentTime >= targetTime) {
            clearInterval(interval);
        }

        if (started && isPressed === false) {
            secondsOff += .5;

            $('#off').text( "Off:" + Math.floor(secondsOff) );

            runToys("stop");

            secondsSinceLastOff = 0;
        }

        if (started && isPressed) {
            secondsOn += .5;

            secondsSinceLastOff += .5;

            $('#on').text( "On:" + Math.floor(secondsOn) );

            var level = Math.floor(secondsSinceLastOff / rampInterval);

            runToys(level);
        }

        if (callBackUrl !== false) {
            doCallBack(callBackUrl, {
                "isPressed": isPressed,
                "startTime": startTime,
                "targetTime": targetTime,
                "secondsOn": secondsOn,
                "secondsOff": secondsOff,
                "secondsSinceLastOff": secondsSinceLastOff
            });
        }

    }, 500);


});


/**
 * Send command and value to the lovense API
 * See the LAN API here: https://www.lovense.com/developer/docs/lanlevel
 *
 * @param string target 	Protocol, url, and port for the toy
 * @param string command 	Command to send the toy(s)
 * @param int v 			Vibration level for toy, 0-20
 */
function sendCommand(target, command, v) {
    $.ajax({
        type : "get",
        url : target + "/" + command + "?v=" + v,
        dataType : "jsonp",
        success : function(data){

        },
        error:function(e){
            console.error(e);
        }
    });
}

/**
 * Makes the toy buttons toggles that turn the toy on or off
 *
 */
function parseToys(toy)
{

    if ($(toy).hasClass("active")) {

        $(toy).removeClass("active");

        stopToy(toy);

    } else {
        $(toy).addClass("active");
    }
}

/**
 * Takes a link element from the #toyList and sets the level to 0
 */
function stopToy(toy) {
    var url = $(toy).attr("x-toy-url");

    sendCommand(url, "Vibrate", 0);
}

/**
 * Sets all active toys to the given level (range 0-20)
 * Special values:
 *
 * max - set to 20
 * stop - stop all toys
 */
function runToys(adjust)
{

    $.each( $('#toyList a.active'), function(i, value) {

        var url = $(value).attr("x-toy-url");
        var level = parseInt($(value).attr("x-toy-level"));


        if (adjust == 'stop') {
            level = 0;
        } else if (adjust == 'max') {
            level = 20;
        } else {
            level = adjust;
        }



        if (level > 20) {
            level = 20;
        }

        $(value).attr("x-toy-level", level);

        sendCommand(url, "Vibrate", level);

    });
}


/**
 * Populate the list of available toys
 *
 */
function getToys() {
    $.ajax({
        type : "get",
        url : "https://api.lovense.com/api/lan/getToys",
        dataType : "jsonp",
        success : function(data){

            data = JSON.parse(data);

            for (var key in data) {
                var domain = data[key].domain;
                var port = data[key].httpPort;

                var baseUrl = 'http://' + domain + ":" + port;

                $('#toyList').append("<a onClick='parseToys(this);' class='btn btn-default toyButton' x-toy-url='"
                    + baseUrl + "' x-toy-level='0'>" + domain+ "</a>");
            }



        },
        error:function(e){
            console.error(e);
        }
    });
}