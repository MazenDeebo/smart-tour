import { useTourStore } from '../store/tourStore';
import socketService from './socketService';
import type { CallType } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private isInitialized: boolean = false;

  initialize(): void {
    if (this.isInitialized) return;
    
    const socket = useTourStore.getState().socket as { on: (event: string, callback: (...args: never[]) => void) => void } | null;
    if (!socket) {
      setTimeout(() => this.initialize(), 1000);
      return;
    }

    socket.on('webrtc-offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      await this.handleOffer(from, offer);
    });

    socket.on('webrtc-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await this.handleAnswer(answer);
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      await this.handleIceCandidate(candidate);
    });

    socket.on('call-accepted', async () => {
      await this.createOffer();
    });

    this.isInitialized = true;
  }

  async getUserMedia(callType: CallType): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: callType === 'video' ? { width: 1280, height: 720, facingMode: 'user' } : false,
    };
    
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    useTourStore.getState().updateCall({ localStream: this.localStream });
    return this.localStream;
  }

  createPeerConnection(): RTCPeerConnection {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        const { remoteUser } = useTourStore.getState().call;
        if (remoteUser) {
          socketService.sendIceCandidate(remoteUser.socketId, e.candidate.toJSON());
        }
      }
    };

    this.peerConnection.ontrack = (e: RTCTrackEvent) => {
      useTourStore.getState().updateCall({ remoteStream: e.streams[0] });
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state && ['disconnected', 'failed', 'closed'].includes(state)) {
        this.endCall();
      }
    };

    return this.peerConnection;
  }

  async startCall(targetSocketId: string, targetName: string, callType: CallType): Promise<void> {
    try {
      this.initialize();
      await this.getUserMedia(callType);
      this.createPeerConnection();
      
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

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

  async acceptCall(): Promise<void> {
    try {
      this.initialize();
      const { call } = useTourStore.getState();
      
      await this.getUserMedia(call.type);
      this.createPeerConnection();
      
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      if (call.remoteUser) {
        socketService.acceptCall(call.remoteUser.socketId);
      }
      useTourStore.getState().updateCall({ state: 'active' });
    } catch (error) {
      console.error('Error accepting call:', error);
      this.rejectCall();
    }
  }

  rejectCall(): void {
    const { call } = useTourStore.getState();
    if (call.remoteUser) {
      socketService.rejectCall(call.remoteUser.socketId);
    }
    this.cleanup();
  }

  async createOffer(): Promise<void> {
    try {
      if (!this.peerConnection) return;
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      const { remoteUser } = useTourStore.getState().call;
      if (remoteUser) {
        socketService.sendOffer(remoteUser.socketId, offer);
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async handleOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      if (!this.peerConnection) this.createPeerConnection();
      
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      
      socketService.sendAnswer(from, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      if (!this.peerConnection) return;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      useTourStore.getState().updateCall({ state: 'active' });
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection && candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  toggleAudio(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      useTourStore.getState().updateCall({ isMuted: !track.enabled });
      return !track.enabled;
    }
    return false;
  }

  toggleVideo(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      useTourStore.getState().updateCall({ isVideoOff: !track.enabled });
      return !track.enabled;
    }
    return false;
  }

  endCall(): void {
    const { call } = useTourStore.getState();
    if (call.remoteUser) {
      socketService.endCall(call.remoteUser.socketId);
    }
    this.cleanup();
  }

  cleanup(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peerConnection?.close();
    this.peerConnection = null;
    this.localStream = null;
    useTourStore.getState().resetCall();
  }
}

export default new WebRTCService();
