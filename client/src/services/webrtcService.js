import { useTourStore } from '../store/tourStore';
import socketService from './socketService';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    const socket = useTourStore.getState().socket;
    if (!socket) {
      setTimeout(() => this.initialize(), 1000);
      return;
    }

    socket.on('webrtc-offer', async ({ from, offer }) => {
      await this.handleOffer(from, offer);
    });

    socket.on('webrtc-answer', async ({ answer }) => {
      await this.handleAnswer(answer);
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }) => {
      await this.handleIceCandidate(candidate);
    });

    socket.on('call-accepted', async () => {
      await this.createOffer();
    });

    this.isInitialized = true;
  }

  async getUserMedia(callType) {
    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    };
    
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    useTourStore.getState().updateCall({ localStream: this.localStream });
    return this.localStream;
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        const { remoteUser } = useTourStore.getState().call;
        if (remoteUser) {
          socketService.sendIceCandidate(remoteUser.socketId, e.candidate);
        }
      }
    };

    this.peerConnection.ontrack = (e) => {
      useTourStore.getState().updateCall({ remoteStream: e.streams[0] });
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (['disconnected', 'failed', 'closed'].includes(state)) {
        this.endCall();
      }
    };

    return this.peerConnection;
  }

  async startCall(targetSocketId, targetName, callType) {
    try {
      this.initialize();
      await this.getUserMedia(callType);
      this.createPeerConnection();
      
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      useTourStore.getState().updateCall({
        state: 'calling',
        type: callType,
        remoteUser: { socketId: targetSocketId, name: targetName },
      });

      socketService.initiateCall(targetSocketId, callType);
    } catch (error) {
      console.error('Error starting call:', error);
      this.cleanup();
      throw error;
    }
  }

  async acceptCall() {
    try {
      this.initialize();
      const { call } = useTourStore.getState();
      
      await this.getUserMedia(call.type);
      this.createPeerConnection();
      
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      socketService.acceptCall(call.remoteUser.socketId);
      useTourStore.getState().updateCall({ state: 'active' });
    } catch (error) {
      console.error('Error accepting call:', error);
      this.rejectCall();
    }
  }

  rejectCall() {
    const { call } = useTourStore.getState();
    if (call.remoteUser) {
      socketService.rejectCall(call.remoteUser.socketId);
    }
    this.cleanup();
  }

  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      const { remoteUser } = useTourStore.getState().call;
      socketService.sendOffer(remoteUser.socketId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async handleOffer(from, offer) {
    try {
      if (!this.peerConnection) this.createPeerConnection();
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      socketService.sendAnswer(from, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      useTourStore.getState().updateCall({ state: 'active' });
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  toggleAudio() {
    const track = this.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      useTourStore.getState().updateCall({ isMuted: !track.enabled });
      return !track.enabled;
    }
    return false;
  }

  toggleVideo() {
    const track = this.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      useTourStore.getState().updateCall({ isVideoOff: !track.enabled });
      return !track.enabled;
    }
    return false;
  }

  endCall() {
    const { call } = useTourStore.getState();
    if (call.remoteUser) {
      socketService.endCall(call.remoteUser.socketId);
    }
    this.cleanup();
  }

  cleanup() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    useTourStore.getState().resetCall();
  }
}

export default new WebRTCService();
