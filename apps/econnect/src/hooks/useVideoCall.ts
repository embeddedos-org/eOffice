import { useState, useCallback, useRef, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  muted?: boolean;
  cameraOff?: boolean;
}

export function useVideoCall(serverUrl: string = 'ws://localhost:3001') {
  const [inCall, setInCall] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [userId, setUserId] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(peerId, pc);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      setParticipants((prev) =>
        prev.map((p) => p.id === peerId ? { ...p, stream: event.streams[0] } : p)
      );
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          targetId: peerId,
          candidate: event.candidate,
        }));
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          wsRef.current?.send(JSON.stringify({
            type: 'offer',
            targetId: peerId,
            sdp: pc.localDescription,
          }));
        });
    }

    return pc;
  }, []);

  const joinCall = useCallback(async (roomId: string, userName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const ws = new WebSocket(`${serverUrl}/ws/signal`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join-call', roomId, name: userName }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'joined':
            setUserId(msg.userId);
            setInCall(true);
            // Connect to existing participants
            msg.participants.forEach((p: { id: string; name: string }) => {
              setParticipants((prev) => [...prev, { id: p.id, name: p.name }]);
              createPeerConnection(p.id, true);
            });
            break;

          case 'peer-joined':
            setParticipants((prev) => [...prev, { id: msg.peerId, name: msg.name }]);
            break;

          case 'offer': {
            const pc = createPeerConnection(msg.fromId, false);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'answer', targetId: msg.fromId, sdp: pc.localDescription }));
            break;
          }

          case 'answer': {
            const pc = peersRef.current.get(msg.fromId);
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            break;
          }

          case 'ice-candidate': {
            const pc = peersRef.current.get(msg.fromId);
            if (pc && msg.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
            break;
          }

          case 'peer-left':
            peersRef.current.get(msg.peerId)?.close();
            peersRef.current.delete(msg.peerId);
            setParticipants((prev) => prev.filter((p) => p.id !== msg.peerId));
            break;

          case 'mute':
          case 'unmute':
            setParticipants((prev) =>
              prev.map((p) => p.id === msg.peerId ? { ...p, muted: msg.type === 'mute' } : p)
            );
            break;

          case 'camera-off':
          case 'camera-on':
            setParticipants((prev) =>
              prev.map((p) => p.id === msg.peerId ? { ...p, cameraOff: msg.type === 'camera-off' } : p)
            );
            break;
        }
      };

      ws.onclose = () => {
        setInCall(false);
        cleanup();
      };
    } catch (err) {
      console.error('Failed to join call:', err);
    }
  }, [serverUrl, createPeerConnection]);

  const leaveCall = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave-call' }));
    wsRef.current?.close();
    cleanup();
    setInCall(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
        wsRef.current?.send(JSON.stringify({ type: audioTrack.enabled ? 'unmute' : 'mute' }));
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
        wsRef.current?.send(JSON.stringify({ type: videoTrack.enabled ? 'camera-on' : 'camera-off' }));
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      // Revert to camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(videoTrack);
      }
      setScreenSharing(false);
      wsRef.current?.send(JSON.stringify({ type: 'screen-stop' }));
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screen.getVideoTracks()[0];
        peersRef.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        screenTrack.onended = () => toggleScreenShare();
        setScreenSharing(true);
        wsRef.current?.send(JSON.stringify({ type: 'screen-share' }));
      } catch {
        // User cancelled screen share
      }
    }
  }, [screenSharing]);

  function cleanup() {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setParticipants([]);
    setMuted(false);
    setCameraOff(false);
    setScreenSharing(false);
  }

  useEffect(() => {
    return () => { cleanup(); wsRef.current?.close(); };
  }, []);

  return {
    inCall,
    participants,
    localStream,
    userId,
    muted,
    cameraOff,
    screenSharing,
    joinCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  };
}
