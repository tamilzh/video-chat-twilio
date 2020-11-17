'use strict';

const TwilioChat = require('twilio-chat');
var fs = require('fs');
// Our interface to the Chat service
var chatClient;

// A handle to the "general" chat channel - the one and only channel we
// will have in this sample app
var generalChannel;
var channelSid;
// The server will assign the client a random username - store that value
// here
var username;
var $chatWindow = $('#messages');
// Helper function to print info messages to the chat window
function print(infoMessage, asHtml) {
    var $msg = $('<div class="info">');
    if (asHtml) {
      $msg.html(infoMessage);
    } else {
      $msg.text(infoMessage);
    }
    $chatWindow.append($msg);
  }

   // Helper function to print chat message to the chat window
  function printMessage(fromUser, $message) {
    var $container = $('<div class="message-container">');
    var $div = $('<div>')
    var $br = $('</br>');
    var $user = $('<span class="username">').text(fromUser);

    if (fromUser === username) {
      $user.addClass('me');
      $message.addClass('me');
      $div.addClass('mine')
    }else{
      $div.addClass('other')
    }
    $div.append($user).append($br).append($message);
    $container.append($div);
    $chatWindow.append($container);
    $chatWindow.scrollTop($chatWindow[0].scrollHeight);    
  }


/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 */
async function Chat(token,identity) {

    // Initialize the Chat client
    TwilioChat.Client.create(token).then(client => {
    console.log('Created chat client');
    chatClient = client;
    chatClient.getSubscribedChannels().then(createOrJoinGeneralChannel);

    // when the access token is about to expire, refresh it
    chatClient.on('tokenAboutToExpire', function() {
     // refreshToken(username);
    });

    // if the access token already expired, refresh it
    chatClient.on('tokenExpired', function() {
    //  refreshToken(username);
    });
    

  // Alert the user they have been assigned a random username
  username = identity;
  console.log('You have been assigned a random username of: '
  + '<span class="me">' + username + '</span>', true);

  }).catch(error => {
    console.error(error);
    console.error('There was an error creating the chat client:<br/>' + error, true);
    console.error('Please check your .env file.', false);
  });
}

function createOrJoinGeneralChannel() {
    // Get the general chat channel, which is where all the messages are
    // sent in this simple application
    console.log('Attempting to join "general" chat channel...');
    chatClient.getChannelByUniqueName('general')
    .then(function(channel) {
      generalChannel = channel;
      console.log('Found general channel:');
      console.log(generalChannel);
      setupChannel();
    }).catch(function(error) {
      console.log(error);
      // If it doesn't exist, let's create it
      console.log('Creating general channel');
      chatClient.createChannel({
        uniqueName: 'general',
        friendlyName: 'General Chat Channel'
      }).then(function(channel) {
        console.log('Created general channel:');
        console.log(channel);
        generalChannel = channel;
        setupChannel();
      }).catch(function(channel) {
        console.log('Channel could not be created:');
        console.log(channel);
      });
    });
  }

  // Set up channel after it has been found
  function setupChannel() {
    // Join the general channel
    channelSid = generalChannel.sid;
    console.log(generalChannel.status)
    if(generalChannel.status !== "joined") {
    generalChannel.join().then(function(channel) {
      console.log('Joined channel as '
      + '<span class="me">' + username + '</span>.', true);
    });
  }

  // Listen for new messages sent to the channel
  generalChannel.on('messageAdded', function(message) {
    console.log("New Message Added : ", message);
    var messageType = message.type;
    var messageMedia = message.media;
    if(messageType === "media"){
      var filename = message.media.filename;
      messageMedia.getContentTemporaryUrl().then(function(url) {
        var $link = $('<a href="'+url+'" target="_blank">'+filename+'</a>')
        var $attr = $('<span class="message">').append($link);
        printMessage(message.author, $attr);
      });
    }else{
      var $attr = $('<span class="message">').text(message.body);
      printMessage(message.author, $attr);
    }
    
  });

     // Send a new message to the general channel
  var $input = $('#chat-input');
  $input.on('keydown', function(e) {

    if (e.keyCode == 13) {
      if (generalChannel === undefined) {
        console.log('The Chat Service is not configured. Please check your .env file.', false);
        return;
      }
     // uploadMedia();
      generalChannel.sendMessage($input.val())
      $input.val('');
    }
  });

  var $inputbtn = $('#chat-input-file');
  $inputbtn.on('click', function(e) {
      uploadMedia();
  });
  }

  function refreshToken(identity) {
    console.log('Token about to expire');
    // Make a secure request to your backend to retrieve a refreshed access token.
    // Use an authentication mechanism to prevent token exposure to 3rd parties.
    $.getJSON('/token/' + identity, function(data) {
      console.log('updated token for chat client');          
      chatClient.updateToken(data.token);
    });
  }

  function uploadMedia(){
   const formData = new FormData();
   formData.append('file', $('#formInputFile')[0].files[0]);
    // get desired channel (for example, with getChannelBySid promise)
    chatClient.getChannelBySid(channelSid).then(function(channel) {
      // send media with all FormData parsed atrtibutes
     channel.sendMessage(formData);
    });
  }
module.exports = Chat;