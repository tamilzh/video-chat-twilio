'use strict';
 
const { connect, createLocalVideoTrack, LocalDataTrack, createLocalTracks } = require('twilio-video');
const { isMobile } = require('./browser');
const controls = require('./audioVideoControls');
const muteYourAudio = controls.muteYourAudio;
const muteYourVideo = controls.muteYourVideo;
const unmuteYourAudio = controls.unmuteYourAudio;
const unmuteYourVideo = controls.unmuteYourVideo;
const sendDataMessage = controls.sendDataMessage;
const dataTrack = new LocalDataTrack();
const $leave = $('#leave-room');
const $room = $('#room');
const $activeParticipant = $('div#active-participant > div.participant.main', $room);
const $activeVideo = $('video', $activeParticipant);
const $participants = $('div#participants', $room);

// The current active Participant in the Room.
let activeParticipant = null;

// Whether the user has selected the active Participant by clicking on
// one of the video thumbnails.
let isActiveParticipantPinned = false;

/**
 * Set the active Participant's video.
 * @param participant - the active Participant
 */
function setActiveParticipant(participant) {
  if (activeParticipant) {
    const $activeParticipant = $(`div#${activeParticipant.sid}`, $participants);
    $activeParticipant.removeClass('active');
    $activeParticipant.removeClass('pinned');

    // Detach any existing VideoTrack of the active Participant.
    const { track: activeTrack } = Array.from(activeParticipant.videoTracks.values())[0] || {};
    if (activeTrack) {
      activeTrack.detach($activeVideo.get(0));
      $activeVideo.css('opacity', '0');
    }
  }

  // Set the new active Participant.
  activeParticipant = participant;
  const { identity, sid } = participant;
  const $participant = $(`div#${sid}`, $participants);

  $participant.addClass('active');
  if (isActiveParticipantPinned) {
    $participant.addClass('pinned');
  }

  // Attach the new active Participant's video.
  const { track } = Array.from(participant.videoTracks.values())[0] || {};
  if (track) {
    track.attach($activeVideo.get(0));
    $activeVideo.css('opacity', '');
  }

  // Set the new active Participant's identity
  $activeParticipant.attr('data-identity', identity);
}

/**
 * Set the current active Participant in the Room.
 * @param room - the Room which contains the current active Participant
 */
function setCurrentActiveParticipant(room) {
  const { dominantSpeaker, localParticipant } = room;
  setActiveParticipant(dominantSpeaker || localParticipant);
}

/* To Mute and Un-Mute the Audio */
function muteLocalParticipant( audioBtn, identity , sid) {

  const mute = !audioBtn.hasClass('muted');
  const participantSID = audioBtn.parent().data('sid');
  
  if (mute) {
    muteYourAudio(room, identity, sid);
    audioBtn.addClass('muted');
    audioBtn.html('<img src="./img/mute-mike.png" alt="unmute" width="20" height="20"/>');
  } else {
      unmuteYourAudio(room, identity, sid);
      audioBtn.removeClass('muted');
      audioBtn.html('<img src="./img/mike.png" alt="Mute" width="20" height="20"/>');
  }
} // End :: muteLocalParticipant()

/* To Mute and Un-Mute the Audio */
function muteRemoteParticipantAudio( audioBtn) {

  const mute = !audioBtn.hasClass('muted');
  if (mute) {
    audioBtn.addClass('muted');
    audioBtn.html('<img src="./img/mute-mike.png" alt="unmute" width="20" height="20"/>');
  } else {
    audioBtn.removeClass('muted');
    audioBtn.html('<img src="./img/mike.png" alt="Mute" width="20" height="20"/>');
  }
} // End :: muteLocalParticipant()


/* To Mute and Un-Mute the Video */
function muteRemoteParticipantVideo( videoBtn) {

  const mute = !videoBtn.hasClass('muted');
  
  if (mute) {
    videoBtn.addClass('muted');
    videoBtn.html('<img src="./img/mute-video.png" alt="unmute" width="20" height="20"/>');
  } else {
    videoBtn.removeClass('muted');
    videoBtn.html('<img src="./img/video.png" alt="Mute" width="20" height="20"/>');
  }
} // End :: muteLocalParticipantVideo()


/*  To Stop and Start the Video */
function videoLocalParticipant( videoBtn, identity, sid ) {

  const mute = !videoBtn.hasClass('muted');
  const participantSID = videoBtn.parent().data('sid');

  if (mute) {
      muteYourVideo(room, identity, sid);
      videoBtn.addClass('muted');
      videoBtn.html('<img src="./img/mute-video.png" alt="Start" width="20" height="20"/>');
  }
  else {
      unmuteYourVideo(room, identity, sid);
      videoBtn.removeClass('muted');
      videoBtn.html('<img src="./img/video.png" alt="Stop" width="20" height="20"/>');
  }

} // End :: videoLocalParticipant()

/* navigator.mediaDevices.enumerateDevices() */
function setupAudioVideocontrols(sid, identity, showAudioButton, showVideoButton, isAdmin) {

  const $controls = $(`<div id="userControls-${sid}" class="bottom-right" data-sid="${sid}"> </div>`);
  const audioBtn = $(`<button id="muteAudioBtn-${sid}" class="btn btn-light btn-sm"><img src="./img/mike.png" alt="Mute" width="20" height="20"/></button>`); // Mute & UnMute
  const videoBtn = $(`<button id="muteVideoBtn-${sid}" class="btn btn-light btn-sm"><img src="./img/video.png" alt="Stop" width="20" height="20"/></button>`); // Video On Off

  audioBtn.on("click", function () {
    if(isAdmin){
      sendDataMessage(dataTrack,JSON.stringify({
        type: "MUTE_FROM_CALL",
        identity: identity,
        sid: sid
        }));    
      }else{
        sendDataMessage(dataTrack,JSON.stringify({
          type: "UPDATE_REMOTE_AUDIO_ICON",
          identity: identity,
          sid: sid
          }));
        muteLocalParticipant($(this), identity, sid);
     }
  });

  videoBtn.on("click", function () {
    if(isAdmin){
      sendDataMessage(dataTrack,JSON.stringify({
        type: "MUTE_VIDEO_FROM_CALL",
        identity: identity,
        sid: sid
        }));    
        
      }else{
        sendDataMessage(dataTrack,JSON.stringify({
          type: "UPDATE_REMOTE_VIDEO_ICON",
          identity: identity,
          sid: sid
          }));
        videoLocalParticipant( $(this), identity, sid);
      }
  });

  if(showVideoButton)
    $controls.append(videoBtn);
  if(showAudioButton)
    $controls.append(audioBtn);
  
  return $controls

} // End :: setupAudioVideocontrols{}


/**
 * Set up the Participant's media container.
 * @param participant - the Participant whose media container is to be set up
 * @param room - the Room that the Participant joined
 */
function setupParticipantContainer(participant, room) {
  const { identity, sid } = participant;

  // Add a container for the Participant's media.
  const $container = $(`<div class="participant col-xs-12 col-sm-6 col-md-4" data-identity="${identity}" id="${sid}">
    <audio autoplay ${participant === room.localParticipant ? 'muted' : ''} style="opacity: 0"></audio>
    <video autoplay muted playsinline style="opacity: 0"></video>
  </div>`);

  // Toggle the pinning of the active Participant's video.
  $container.on('click', () => {
    if (activeParticipant === participant && isActiveParticipantPinned) {
      // Unpin the RemoteParticipant and update the current active Participant.
      setVideoPriority(participant, null);
      isActiveParticipantPinned = false;
      setCurrentActiveParticipant(room);
    } else {
      // Pin the RemoteParticipant as the active Participant.
      if (isActiveParticipantPinned) {
        setVideoPriority(activeParticipant, null);
      }
      setVideoPriority(participant, 'high');
      isActiveParticipantPinned = true;
      setActiveParticipant(participant);
    }
  });
  var isAdmin = room.localParticipant.identity.indexOf("Admin") >= 0;
  //mute option for local participants
  if(participant === room.localParticipant){
    var videoDiv = $(`<div class="video-group" id="avbtn-${sid}" style="position:absolute;width:100%;text-align:right;margin-top:50px"></div>`);
    const $controls = setupAudioVideocontrols(sid, identity, true, true, false);
    videoDiv.append($controls); // Buttons on Video boxes
    $container.append(videoDiv);
  }else if(isAdmin){
    var videoDiv = $(`<div class="video-group" id="avbtn-${sid}" style="position:absolute;width:100%;text-align:right;margin-top:50px"></div>`);
    const $controls = setupAudioVideocontrols(sid, identity, true, false, true);
    videoDiv.append($controls); // Buttons on Video boxes
    $container.append(videoDiv);

  }

  // Add the Participant's container to the DOM.
  $participants.append($container);
}

/**
 * Set the VideoTrack priority for the given RemoteParticipant. This has no
 * effect in Peer-to-Peer Rooms.
 * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
 * @param priority - null | 'low' | 'standard' | 'high'
 */
function setVideoPriority(participant, priority) {
  participant.videoTracks.forEach(publication => {
    const track = publication.track;
    if (track && track.setPriority) {
      track.setPriority(priority);
    }
  });
}

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param participant - the Participant which published the Track
 */
function attachTrack(track, participant) {
  if(track.kind === "video" || track.kind === "audio"){
    // Attach the Participant's Track to the thumbnail.
    const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
    $media.css('opacity', '');
    track.attach($media.get(0));

    // If the attached Track is a VideoTrack that is published by the active
    // Participant, then attach it to the main video as well.
    if (track.kind === 'video' && participant === activeParticipant) {
      track.attach($activeVideo.get(0));
      $activeVideo.css('opacity', '');
    }
  }
}

/**
 * Detach a Track from the DOM.
 * @param track - the Track to be detached
 * @param participant - the Participant that is publishing the Track
 */
function detachTrack(track, participant) {
  if(track.kind === "video" || track.kind === "audio"){
    // Detach the Participant's Track from the thumbnail.
    const $media = $(`div#${participant.sid} > ${track.kind}`, $participants);
    $media.css('opacity', '0');
    track.detach($media.get(0));

    // If the detached Track is a VideoTrack that is published by the active
    // Participant, then detach it from the main video as well.
    if (track.kind === 'video' && participant === activeParticipant) {
      track.detach($activeVideo.get(0));
      $activeVideo.css('opacity', '0');
    }
  }
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant, room) {
  // Set up the Participant's media container.
  setupParticipantContainer(participant, room);

  // Handle the TrackPublications already published by the Participant.
  participant.tracks.forEach(publication => {
    trackPublished(publication, participant);
  });

  // Handle theTrackPublications that will be published by the Participant later.
  participant.on('trackPublished', publication => {
    trackPublished(publication, participant);
  });
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(participant, room) {
  // If the disconnected Participant was pinned as the active Participant, then
  // unpin it so that the active Participant can be updated.
  if (activeParticipant === participant && isActiveParticipantPinned) {
    isActiveParticipantPinned = false;
    setCurrentActiveParticipant(room);
  }

  // Remove the Participant's media container.
  $(`div#${participant.sid}`, $participants).remove();
}

/**
 * Handle to the TrackPublication's media.
 * @param publication - the TrackPublication
 * @param participant - the publishing Participant
 */
function trackPublished(publication, participant) {
  // If the TrackPublication is already subscribed to, then attach the Track to the DOM.
  if (publication.track) {
    attachTrack(publication.track, participant);
  }

  // Once the TrackPublication is subscribed to, attach the Track to the DOM.
  publication.on('subscribed', track => {
    track.on("message", function (message) {
      const messageBody = JSON.parse(message);
        if (
          messageBody.identity ===
          room.localParticipant.identity
        ) {
          if (messageBody.type === "MUTE_FROM_CALL") {
            $("#muteAudioBtn-"+messageBody.sid).click();
          }else if (messageBody.type === "MUTE_VIDEO_FROM_CALL"){
            $("#muteVideoBtn-"+messageBody.sid).click();
          }
      }else{
        if (messageBody.type === "UPDATE_REMOTE_AUDIO_ICON"){
          muteRemoteParticipantAudio($("#muteAudioBtn-"+messageBody.sid));
        }else if (messageBody.type === "UPDATE_REMOTE_VIDEO_ICON"){
          muteRemoteParticipantVideo($("#muteVideoBtn-"+messageBody.sid));
        }
      }
    });
    attachTrack(track, participant);
  });

  // Once the TrackPublication is unsubscribed from, detach the Track from the DOM.
  publication.on('unsubscribed', track => {
    detachTrack(track, participant);
  });
}

/**
 * Setup a LocalAudioTrack and LocalVideoTrack to render to a <video> element.
 * @param {HTMLVideoElement} video
 * @returns {Promise<Array<LocalAudioTrack|LocalVideoTrack>>} audioAndVideoTrack
 */
async function setupLocalAudioAndVideoTracks(video) {
  const audioAndVideoTrack = await createLocalTracks();
  return audioAndVideoTrack;
}

/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 */
async function joinRoom(token, connectOptions) {
  // Join to the Room with the given AccessToken and ConnectOptions.
  const audioAndVideoTrack = await setupLocalAudioAndVideoTracks();
  const tracks = audioAndVideoTrack.concat(dataTrack);
  const name = "Video Chat"
  //const room = await video.connect(token, connectOptions);
  const room = await connect(token, {
    name,
    tracks
  });

  // Save the LocalVideoTrack.
  let localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0].track;

  // Make the Room available in the JavaScript console for debugging.
  window.room = room;

  // Handle the LocalParticipant's media.
  participantConnected(room.localParticipant, room);

  // Subscribe to the media published by RemoteParticipants already in the Room.
  room.participants.forEach(participant => {
    participantConnected(participant, room);
  });

  // Subscribe to the media published by RemoteParticipants joining the Room later.
  room.on('participantConnected', participant => {
    participantConnected(participant, room);
  });

  // Handle a disconnected RemoteParticipant.
  room.on('participantDisconnected', participant => {
    participantDisconnected(participant, room);
  });

  // Set the current active Participant.
  setCurrentActiveParticipant(room);

  // Update the active Participant when changed, only if the user has not
  // pinned any particular Participant as the active Participant.
  room.on('dominantSpeakerChanged', () => {
    if (!isActiveParticipantPinned) {
      setCurrentActiveParticipant(room);
    }
  });

  // Leave the Room when the "Leave Room" button is clicked.
  $leave.click(function onLeave() {
    $leave.off('click', onLeave);
    room.disconnect();
  });

  return new Promise((resolve, reject) => {
    // Leave the Room when the "beforeunload" event is fired.
    window.onbeforeunload = () => {
      room.disconnect();
    };

    if (isMobile) {
      // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
      // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
      window.onpagehide = () => {
        room.disconnect();
      };

      // On mobile browsers, use "visibilitychange" event to determine when
      // the app is backgrounded or foregrounded.
      document.onvisibilitychange = async () => {
        if (document.visibilityState === 'hidden') {
          // When the app is backgrounded, your app can no longer capture
          // video frames. So, stop and unpublish the LocalVideoTrack.
          localVideoTrack.stop();
          room.localParticipant.unpublishTrack(localVideoTrack);
        } else {
          // When the app is foregrounded, your app can now continue to
          // capture video frames. So, publish a new LocalVideoTrack.
          localVideoTrack = await createLocalVideoTrack(connectOptions.video);
          await room.localParticipant.publishTrack(localVideoTrack);
        }
      };
    }

    room.once('disconnected', (room, error) => {
      // Clear the event handlers on document and window..
      window.onbeforeunload = null;
      if (isMobile) {
        window.onpagehide = null;
        document.onvisibilitychange = null;
      }

      // Stop the LocalVideoTrack.
      localVideoTrack.stop();

      // Handle the disconnected LocalParticipant.
      participantDisconnected(room.localParticipant, room);

      // Handle the disconnected RemoteParticipants.
      room.participants.forEach(participant => {
        participantDisconnected(participant, room);
      });

      // Clear the active Participant's video.
      $activeVideo.get(0).srcObject = null;

      // Clear the Room reference used for debugging from the JavaScript console.
      window.room = null;

      if (error) {
        // Reject the Promise with the TwilioError so that the Room selection
        // modal (plus the TwilioError message) can be displayed.
        reject(error);
      } else {
        // Resolve the Promise so that the Room selection modal can be
        // displayed.
        resolve();
      }
    });
  });
}

module.exports = joinRoom;
