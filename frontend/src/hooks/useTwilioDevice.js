import { useState, useEffect, useRef, useCallback } from 'react';
import { twilioAPI } from '../api/client';
import { Device } from "@twilio/voice-sdk";
/**
 * Connection states exposed to the UI.
 * Maps internal Twilio Device/Call states to user-friendly labels.
 */
const ConnectionState = {
  OFFLINE: 'offline',
  CONNECTING: 'connecting',
  READY: 'ready',
  RINGING: 'ringing',
  IN_CALL: 'in-call',
  ERROR: 'error',
};

/**
 * Custom hook that manages the full Twilio Voice SDK Device lifecycle.
 *
 * Handles: token fetch → Device init → registration → connect/disconnect,
 * plus mute toggle, call SID tracking, and error surfacing.
 *
 * @returns {object} — state and control functions for the UI
 */
export default function useTwilioDevice() {
  const [status, setStatus] = useState(ConnectionState.OFFLINE);
  const [error, setError] = useState(null);
  const [callSid, setCallSid] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);

  const deviceRef = useRef(null);
  const callRef = useRef(null);

  // ------------------------------------------------------------------
  // Cleanup helper
  // ------------------------------------------------------------------
  const cleanup = useCallback(() => {
    if (callRef.current) {
      try { callRef.current.disconnect(); } catch (_) {}
      callRef.current = null;
    }
    if (deviceRef.current) {
      try { deviceRef.current.unregister(); } catch (_) {}
      try { deviceRef.current.destroy(); } catch (_) {}
      deviceRef.current = null;
    }
    setCallSid(null);
    setIsMuted(false);
    setDeviceReady(false);
    setStatus(ConnectionState.OFFLINE);
  }, []);

  // ------------------------------------------------------------------
  // Initialize: fetch token → create Device → register
  // ------------------------------------------------------------------
  const initialize = useCallback(async () => {
    setError(null);
    setStatus(ConnectionState.CONNECTING);

    try {
      // 1. Fetch access token from backend (JWT-authenticated)
      const res = await twilioAPI.getToken();
      const { token } = res.data;

      // 2. Create and configure the Device
      const device = new Device(token, {
        logLevel: 'warn',
        codecPreferences: ['opus', 'pcmu'],
      });

      // --- Device events ---
      device.on('registered', () => {
        setDeviceReady(true);
        setStatus(ConnectionState.READY);
      });

      device.on('error', (err) => {
        console.error('[TwilioDevice] Error:', err);
        setError(err.message || 'Twilio device error');
        setStatus(ConnectionState.ERROR);
      });

      device.on('unregistered', () => {
        setDeviceReady(false);
        setStatus(ConnectionState.OFFLINE);
      });

      device.on('tokenWillExpire', async () => {
        try {
          const refreshRes = await twilioAPI.getToken();
          device.updateToken(refreshRes.data.token);
        } catch (e) {
          console.error('[TwilioDevice] Token refresh failed:', e);
        }
      });

      // 3. Register the device with Twilio
      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('[TwilioDevice] Initialization failed:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to initialize');
      setStatus(ConnectionState.ERROR);
    }
  }, []);

  // ------------------------------------------------------------------
  // Connect (start call)
  // ------------------------------------------------------------------
  const connect = useCallback(async () => {
    if (!deviceRef.current || !deviceReady) {
      setError('Device not ready. Please wait.');
      return;
    }

    setError(null);
    setStatus(ConnectionState.RINGING);
    setIsMuted(false);

    try {
      const call = await deviceRef.current.connect();

      call.on('accept', () => {
        setCallSid(call.parameters?.CallSid || null);
        setStatus(ConnectionState.IN_CALL);
      });

      call.on('disconnect', () => {
        callRef.current = null;
        setCallSid(null);
        setIsMuted(false);
        setStatus(ConnectionState.READY);
      });

      call.on('cancel', () => {
        callRef.current = null;
        setCallSid(null);
        setIsMuted(false);
        setStatus(ConnectionState.READY);
      });

      call.on('error', (err) => {
        console.error('[TwilioCall] Error:', err);
        setError(err.message || 'Call error');
        setStatus(ConnectionState.ERROR);
      });

      callRef.current = call;
    } catch (err) {
      console.error('[TwilioDevice] Connect failed:', err);
      setError(err.message || 'Failed to connect');
      setStatus(ConnectionState.READY);
    }
  }, [deviceReady]);

  // ------------------------------------------------------------------
  // Disconnect (end call)
  // ------------------------------------------------------------------
  const disconnect = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
    }
  }, []);

  // ------------------------------------------------------------------
  // Mute toggle
  // ------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const newMuted = !isMuted;
      callRef.current.mute(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    error,
    callSid,
    isMuted,
    deviceReady,
    initialize,
    connect,
    disconnect,
    toggleMute,
    cleanup,
    ConnectionState,
  };
}
