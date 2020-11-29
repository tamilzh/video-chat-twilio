'use strict';

/**
 * Mute/unmute your media in a Room.
 * @param {Room} room - The Room you have joined
 * @param {'audio'|'video'} kind - The type of media you want to mute/unmute
 * @param {'mute'|'unmute'} action - Whether you want to mute/unmute
 */
function muteOrUnmuteYourMedia(room, kind, action, identity, sid) {
  const publications = kind === 'audio'
    ? room.localParticipant.audioTracks
    : room.localParticipant.videoTracks;

  if(room.localParticipant.identity === identity) {
    publications.forEach(function(publication) {
      if (action === 'mute') {
        publication.track.disable();
      } else {
        publication.track.enable();
      }
    });
  }else{
    /** Its not in use will keep it for reference */
    room.participants.forEach(function (track) {
      if(track.identity == identity){
          const remotePublications = kind === 'audio'
        ? track.audioTracks
        : track.videoTracks;
        
        remotePublications.forEach(function(remotePublication) {
            if (action === 'mute') {
              remotePublication.track.mediaStreamTrack.enabled = false;
              //remotePublication.track.mediaStreamTrack.muted = true;
            } else {
              remotePublication.track.mediaStreamTrack.enabled = true;
              //remotePublication.track.mediaStreamTrack.muted = false;
            } 
        });
      }
    });
  }
}


/**
 * Mute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourAudio(room, identity, sid) {
  muteOrUnmuteYourMedia(room, 'audio', 'mute', identity, sid);
}

/**
 * Mute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function muteYourVideo(room, identity, sid) {
  muteOrUnmuteYourMedia(room, 'video', 'mute', identity, sid);
}

/**
 * Unmute your audio in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourAudio(room, identity, sid) {
  muteOrUnmuteYourMedia(room, 'audio', 'unmute', identity, sid);
}

/**
 * Unmute your video in a Room.
 * @param {Room} room - The Room you have joined
 * @returns {void}
 */
function unmuteYourVideo(room, identity, sid) {
  muteOrUnmuteYourMedia(room, 'video', 'unmute', identity, sid);
}

/**
 * Send a chat message using the given LocalDataTrack.
 * @param {LocalDataTrack} dataTrack - The {@link LocalDataTrack} to send a message on
 * @param {string} message - The message to be sent
 */
function sendDataMessage(dataTrack, message) {
  //alert(message);
  dataTrack.send(message);
}

/**
 * A RemoteParticipant muted or unmuted its media.
 * @param {Room} room - The Room you have joined
 * @param {function} onMutedMedia - Called when a RemoteParticipant muted its media
 * @param {function} onUnmutedMedia - Called when a RemoteParticipant unmuted its media
 * @returns {void}
 */
function participantMutedOrUnmutedMedia(room, onMutedMedia, onUnmutedMedia) {
  room.on('trackSubscribed', function(track, publication, participant) {
    track.on('disabled', function() {
      return onMutedMedia(track, participant);
    });
    track.on('enabled', function() {
      return onUnmutedMedia(track, participant);
    });
  });
}

exports.muteYourAudio = muteYourAudio;
exports.muteYourVideo = muteYourVideo;
exports.unmuteYourAudio = unmuteYourAudio;
exports.unmuteYourVideo = unmuteYourVideo;
exports.participantMutedOrUnmutedMedia = participantMutedOrUnmutedMedia;
exports.sendDataMessage = sendDataMessage;
