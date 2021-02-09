import React from 'react';
import DailyIframe from '@daily-co/daily-js';

class VideoCallFrame extends React.Component {

  constructor(props) {
    super(props);
    this.iframeRef = React.createRef();
  }

  state = {
    participants: {},
    handRaised: new Set(),
    isHandRaised: false,
    userId: null,
  }

  componentDidMount() {
    if (!this.props.url) {
      console.error('please set REACT_APP_DAILY_ROOM_URL env variable!');
      return;
    }

    this.daily = DailyIframe.wrap(this.iframeRef.current);
    this.daily.join({ url: this.props.url });
    this.initializeEventHandling();
  }

  get userId () {
    const { participants } = this.state;
    if (participants && participants.local) {
      return participants.local.user_id;
    } else {
      return null;
    }
  }

  initializeEventHandling() {
    // Update username
    const queryParams = new URLSearchParams(window.location.search);
    const userName = queryParams.get('user');
    if (userName) {
        this.daily.setUserName(userName);
    }

    this.daily.on('joined-meeting', this.handleJoinedMeeting);
    this.daily.on('participant-joined', this.handleParticipantUpdated);
    this.daily.on('participant-updated', this.handleParticipantUpdated);
    this.daily.on('participant-left', this.handleParticipantLeft);
    this.daily.on('app-message', this.handleAppMessage);
  }

  handleJoinedMeeting = (e) => {
    console.log('handleJoinedMeeting', e);
    this.daily.callFrame.sendAppMessage({ message: "request-hand-status" }, '*');
    let participants = e.participants;
    const userId = participants.local.user_id;
    participants[userId] = participants.local;
    console.log('handleJoinedMeeting - participants', participants);
    this.setState({userId: userId, participants: participants});
  }

  handleParticipantUpdated = (e) => {
    console.log('handleParticipantUpdated', e);
    let { participants } = this.state;
    participants[e.participant.user_id] = e.participant;
    console.log('handleParticipantUpdated - participants', participants);
    this.setState({ participants: participants });
    if (e.participant.local) {
      this.setState({ userId: e.participant.user_id});
    }
  }

  handleParticipantLeft = (e) => {
    console.log('handleParticipantLeft', e);
    let { participants } = this.state;
    delete participants[e.participant.user_id];
    console.log('handleParticipantLeft - participants', participants);
    this.setState({ participants: participants });
  }

  handleAppMessage = (e) => {
    console.log('handleAppMessage', e);
    const { handRaised } = this.state;
    if (e.data.message === 'raise-hand') {
        handRaised.add(e.fromId);
        this.setState({ handRaised: handRaised });
    }
    else if (e.data.message === 'lower-hand') {
        handRaised.delete(e.fromId);
        this.setState({ handRaised: handRaised });
    }
  }

  handleRaiseLowerButtonClick = () => {
      // Toggle hand-raised status
      const { userId, handRaised } = this.state;
      let { isHandRaised } = this.state;
      if (handRaised.has(userId)) {
        handRaised.delete(userId);
        isHandRaised = false;
      } else {
        handRaised.add(userId);
        isHandRaised = true;
      }

      // Broadcast hand-raised status
      const message = isHandRaised ? 'raise-hand' : 'lower-hand';
      this.daily.sendAppMessage({ message }, '*');

      this.setState({ handRaised: handRaised, isHandRaised: isHandRaised });
  }

  get participantsList () {
    const { participants, handRaised } = this.state;
    if (participants) {
      return Object.values(participants).map(participant => {
        const userName = participant.user_name || `Anonymous ${participant.user_id.substring(0,5)}`;
        const isRaised = handRaised.has(participant.user_id);
        const emoji = isRaised ? <span>✋</span> : null;
        return <div key={participant.user_id}>{userName} {emoji}</div>;
      });
    }
    return null;
  }

  render() {
    return (
      <div>
        <div>
            <button id="raise-lower" onClick={this.handleRaiseLowerButtonClick}>
                {this.state.isHandRaised ? 'Lower hand' : 'Raise hand'}
            </button>
        </div>
        <div id="participants-container">
            <h3 class="title">Participants</h3>
            <div id="participants">
                {this.participantsList}
            </div>
        </div>

        <iframe className="Video-Frame"
          title="video call iframe"
          ref={this.iframeRef}
          allow="camera; microphone; fullscreen"
        />
      </div>
    );
  }
}

export default VideoCallFrame;