window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, canvasElem, waveCanvas, noteElem;
// pitchElem

window.onload = function () {
  audioContext = new AudioContext();
  MAX_SIZE = Math.max(4, Math.floor(audioContext.sampleRate / 5000)); // corresponds to a 5kHz signal
  detectorElem = document.getElementById("detector");
  canvasElem = document.getElementById("output");
  DEBUGCANVAS = document.getElementById("waveform");
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "white";
    waveCanvas.lineWidth = 1;
  }
  // pitchElem = document.getElementById("pitch");
  noteElem = document.getElementById("note");
  detectorElem.ondragenter = function () {
    this.classList.add("droptarget");
    return false;
  };
  detectorElem.ondragleave = function () {
    this.classList.remove("droptarget");
    return false;
  };
  detectorElem.ondrop = function (e) {
    this.classList.remove("droptarget");
    e.preventDefault();
    theBuffer = null;

    var reader = new FileReader();
    reader.onload = function (event) {
      audioContext.decodeAudioData(
        event.target.result,
        function (buffer) {
          theBuffer = buffer;
        },
        function () {
          alert("error loading!");
        }
      );
    };
    reader.onerror = function (event) {
      alert("Error: " + reader.error);
    };
    reader.readAsArrayBuffer(e.dataTransfer.files[0]);
    return false;
  };
  fetch("whistling3.ogg")
    .then((response) => {
      return response.arrayBuffer();
    })
    .then((buffer) => audioContext.decodeAudioData(buffer))
    .then((decodedData) => {
      theBuffer = decodedData;
    });
};

function startPitchDetect() {
  document.getElementById("loader").style.display = "flex";
  // Récupération de la liste déroulante
  // var select = document.getElementById("input-device-select");

  // // Récupération de l'ID du périphérique sélectionné

  // select.style.display = "none";
  // grab an audio context
  audioContext = new AudioContext();

  // Définition des contraintes de la média stream
  deviceId = window.location.search.slice(8);
  navigator.mediaDevices
    .getUserMedia({
      audio: {
        deviceId: deviceId,
        googAutoGainControl: "true",
        googEchoCancellation: "false",
        googNoiseSuppression: "false",
        googHighpassFilter: "false",
      },
    })
    .then((stream) => {
      const gainNode = audioContext.createGain();
      // Réglez le gain sur 2 (double le volume)
      gainNode.gain.value = 15;
      // Connectez le nœud de gain à la destination de l'audio context
      gainNode.connect(audioContext.destination);
      // Create an AudioNode from the stream.
      mediaStreamSource = audioContext.createMediaStreamSource(stream);
      // Connectez la source audio au nœud de gain
      // mediaStreamSource.connect(gainNode);
      // Connect it to the destination.
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      mediaStreamSource.connect(analyser);
      updatePitch();
    })
    .catch((err) => {
      // always check for errors at the end.
      console.error(`${err.name}: ${err.message}`);
      alert("Stream generation failed.");
    });
}

var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array(buflen);

var noteStrings = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function noteFromPitch(frequency) {
  var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency, note) {
  return Math.floor(
    (1200 * Math.log(frequency / frequencyFromNoteNumber(note))) / Math.log(2)
  );
}

function autoCorrelate(buf, sampleRate) {
  // Implements the ACF2+ algorithm
  var SIZE = buf.length;
  var rms = 0;

  for (var i = 0; i < SIZE; i++) {
    var val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01)
    // not enough signal
    return -1;

  var r1 = 0,
    r2 = SIZE - 1,
    thres = 0.2;
  for (var i = 0; i < SIZE / 2; i++)
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  for (var i = 1; i < SIZE / 2; i++)
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  var c = new Array(SIZE).fill(0);
  for (var i = 0; i < SIZE; i++)
    for (var j = 0; j < SIZE - i; j++) c[i] = c[i] + buf[j] * buf[j + i];

  var d = 0;
  while (c[d] > c[d + 1]) d++;
  var maxval = -1,
    maxpos = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  var T0 = maxpos;

  var x1 = c[T0 - 1],
    x2 = c[T0],
    x3 = c[T0 + 1];
  a = (x1 + x3 - 2 * x2) / 2;
  b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// tableau des fréquences des notes de chaque corde de guitare (en Hz)
var guitarStrings = [82.41, 110, 146.83, 196, 246.94, 329.63];

// utilisation de la fonction
function updatePitch(time) {
  document.getElementById("loader").style.display = "none";
  document.getElementById("bar").style.display = "block";

  var cycles = new Array();
  analyser.getFloatTimeDomainData(buf);
  var ac = autoCorrelate(buf, audioContext.sampleRate);
  if (ac == -1) {
    detectorElem.className = "vague";

    noteElem.innerText = "-";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    // pitchElem.innerText = Math.round(pitch);
    var note = noteFromPitch(pitch);
    noteElem.innerHTML = noteStrings[note % 12];
    if (detune == 0) {
      // les éléments deviennent verts ici
      // pitchElem.style.color = "green";
      noteElem.style.color = "green";
    } else {
      // fonction pour détecter quelle corde de guitare est grattée
      var detune = centsOffFromPitch(pitch, note);
      //curseur
      function updateCursorPosition(detune) {
        const cursor = document.getElementById("cursor");
        const bar = document.getElementById("bar");
        const tolerance = document.getElementById("tolerance");
        const maxDetune = 100;
        const minDetune = -100;
        const range = maxDetune - minDetune;
        const position = (detune - minDetune) / range;
        cursor.style.left = position * bar.offsetWidth + "px";
        if (Math.abs(detune) < 10) {
          cursor.style.backgroundColor = "green";
        } else {
          cursor.style.backgroundColor = "black";
        }
      }
      updateCursorPosition(detune);

      // les éléments redeviennent gris si la note est trop éloignée

      if (Math.abs(detune) > 10) {
        // pitchElem.style.color = "lightgrey";
        noteElem.style.color = "lightgrey";
      } else {
        // pitchElem.style.color = "green";
        noteElem.style.color = "green";
      }
    }
  }
  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  setTimeout(updatePitch, 100);
}
