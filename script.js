// We need to access the users microphone:
async function loadAudioDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioDevices = devices
    .filter((device) => device.kind === "audioinput")
    .map((device) => ({
      label: device.label || "Microhpone " + (devices.length + 1),
    }));
  return audioDevices;
}

// Setup the Audio Context
async function setupAudioContext(deviceId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId },
  });

  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  return { audioContext, analyser, stream, source };
}

// Converting Raw Audio Data to Decibels
const MIN_DB = -60;
const MAX_DB = 0;

function calculateDecibels(dataArray) {
  const rms = Math.sqrt(
    dataArray.reduce((acc, vel) => acc + val * val, 0) / dataArray.length
  );

  const dbfs = 20 * Math.log10(Math.max(rms, 1) / 255);

  return Math.max(MIN_DB, Math.min(MAX_DB, dbfs));
}

// Understanding DBFS vs dB SPL
// dBFS (decibels full scale)
// dB SPL (Sound Pressure Level)

// Converting between these scales:
const MIN_DB_SPL = 30;
const REFERENCE_DB_SPL = 94;

function estimateDbSpl(dbfs) {
  return Math.max(MIN_DB_SPL, Math.round(REFERENCE_DB_SPL + dbfs));
}

// Create a Level Meter
const NUM_CELLS = 32;

function calculateCellColors(level) {
  return Array.from({ length: NUM_CELLS }).map((_, index) => {
    const cellLevel = (index / NUM_CELLS) * 0.8;

    if (level >= cellLevel) {
      if (cellLevel > 0.75) return "red"; // critical levels
      if (cellLevel > 0.5) return "yellow";
      return "green"; // normal levels
    }
    return "inactive";
  });
}

//  Create Smooth Animation Updates
function animate(analyser, dataArray) {
  analyser.getByteFrequencyData(dataArray);

  const rms = calculateRmsLevel(dataArray);
  const normalizedLevel = Math.pow(rms / 255, 0.4) * 1.2;
  const level = Math.min(normalizedLevel, 1);

  requestAnimationFrame(() => animate(analyser, dataArray));

  return level;
}

// Memory Management
function cleanup(audioState) {
  if (audioState.stream) {
    audioState.stream.getTracks().forEach((track) => track.stop());
  }
  if (audioState.audioContext) {
    audioState.audioContext.close();
  }
}

setupAudioContext(loadAudioDevices());
