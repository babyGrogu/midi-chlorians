const notes = [
  'C=B#',   // 0
  'Db/C#',  // 1
  'D',      // 2
  'Eb/D#',  // 3
  'E=Fb',   // 4
  'F=E#',   // 5
  'Gb/F#',  // 6
  'G',      // 7
  'Ab/G#',  // 8
  'A',      // 9
  'Bb/A#',  // 10
  'B=Cb'    // 11
];
const keys = [
  {label: 'C Major', root: notes[0]},   // no sharps or flats
  {label: 'G Major', root: notes[7]},   // sharps
  {label: 'D Major', root: notes[2]},
  {label: 'A Major', root: notes[9]},
  {label: 'E Major', root: notes[4]},
  {label: 'B Major', root: notes[11]},
  {label: 'F# Major', root: notes[6]},
  {label: 'C# Major', root: notes[1]},
  {label: 'F Major', root: notes[5]},   // flats
  {label: 'Bb Major', root: notes[10]},
  {label: 'Eb Major', root: notes[3]},
  {label: 'Ab Major', root: notes[8]},
  {label: 'Db Major', root: notes[1]},
  {label: 'Gb Major', root: notes[6]},
  {label: 'Cb Major', root: notes[11]},
  // todo: add minor keys
];
keys.forEach((k,i) => k.i = i); // number the keys with i

//const CLEF_BASS = 'bass';
//const CLEF_TREBLE = 'treble';
//const INST_BASS4 = 'bass4';
//const INST_BASS5 = 'bass5';
//const INST_BASS6 = 'bass6';
//const INST_GUITAR = 'guitar';
//const INST_PIANO = 'piano';
const KEY_MAJOR_HALF_STEPS = [2,2,1,2,2,2,1];
const KEY_MINOR_HALF_STEPS = [2,1,2,2,1,2,2]
const NONE = 'none';

//let clef = CLEF_BASS;
//let inst = INST_BASS4;
let keySteps = KEY_MAJOR_HALF_STEPS;
let chooseNoteTimer = -1;
let animationFramesCtr = 0;
let heardCnt = 0;
let pitchElem, noteElem, numCorrect, detuneElem, detuneAmount, lastPlayed;
let loopNote, loopsCtr, padTimerRestart, padTimerStop, timeoutThird, timeoutFifth, timeoutSeventh;
let padFreqs = {};
let inited =  false; // inited doesn't have a UI setting so keeping out of rcs

// arrays of notes
let notesActual=[], noteNamesInKey, notesActualInKeyForRange=[], notesMinimum=[];

// webaudio variables
let analyser = null;
let audioContext = null;
let rafID = null;
let buf = new Float32Array( 2048 );


createsNotesArrays();

// onload handler has to be at top
window.onload = function () {
	pitchElem = document.getElementById("pitch");
	noteElem = document.getElementById("note");
	numCorrect = document.getElementById("numCorrect");
	detuneElem = document.getElementById("detune");
	detuneAmount = document.getElementById("detune_amt");
	lastPlayed = document.getElementById("lastPlayed");

  // is this the best place to start all this?
  initKonva();
}

function startAudioProcessing() {
  // no listening mode
  if (rcs.listening === NONE) {
    return;
  }

  function gotStream(stream) {
    console.log('gs ');
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    if (rcs.amp) {
      analyser.connect(audioContext.destination);
    }
    updatePitch();
    beep(); // so i know it worked
  }

  function handleError(err) {
    // always check for errors at the end.
    console.error(`${err.name}: ${err.message}`);
    alert('Stream generation failed.');
  }

  // get an audio context
  audioContext = new AudioContext();

  // new version of getUserMedia from 
  // https://github.com/cwilso/PitchDetect/commit/dcae53dc491e42806870abf5588f6f46df56a9a5
  if (rcs.listening === 'mic') {
    // Attempt to get audio input
    navigator.mediaDevices.getUserMedia({
      "audio": {
        "mandatory": {
          "googEchoCancellation": "false",
          "googAutoGainControl": "false",
          "googNoiseSuppression": "false",
          "googHighpassFilter": "false"
        },
        "optional": []
      }
    }).then((stream) => {
      gotStream(stream);
    }).catch(handleError);
  } else if (rcs.listening === 'cable') {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      devices.forEach(device => {
        if (device.label.indexOf('USB ') > -1 && device.kind.indexOf('audioinput') > -1) {
          navigator.mediaDevices.getUserMedia({
            "audio": {
              "deviceId": device.deviceId
            }
          }).then(stream => {
            gotStream(stream);
          }).catch(handleError);
        }
      });
    });
  }
}

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
	return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

function autoCorrelate( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms<0.01) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

function binarySearch(freq) {
  let lower = 0, middle = 0, upper = notesMinimum.length-1, oopsCtr = 0;
  function compare() {
    if (freq < notesMinimum[middle].f) {
      return 0;
    }
    return 1;
  }
  while (upper - lower > 1) {
    middle = Math.floor((lower + upper)/2);
    if (compare()) {
      lower = middle;
    } else {
      upper = middle;
    }
    oopsCtr++; if (oopsCtr > notesMinimum.length) break;
  }
  return notesMinimum[lower];
}
      
function updatePitch() {

	analyser.getFloatTimeDomainData( buf );
	var noteFreq = autoCorrelate( buf, audioContext.sampleRate );

  animationFramesCtr++;
 	if (noteFreq == -1) {
	 	  pitchElem.innerText = "--";
		  noteElem.innerText = "-";
		  detuneAmount.innerText = "--";
 	} else {
	 	pitchElem.innerText = Math.round( noteFreq ) ;
	 	let note = noteFromPitch( noteFreq );
		noteElem.innerHTML = notes[note%12];

    if (notesMinimum[0].f <= noteFreq && noteFreq < notesActual[notesActual.length-1].f) {
      const noteHeard = binarySearch(noteFreq);
      /*
      console.log(
        (noteHeard) ?
          noteHeard.n + noteHeard.l + ' ' + noteHeard.f + ' ' + noteFreq
          :
          'oops ' + noteFreq
      );
      */
      if (noteHeard) {
        noteElem.innerHTML = noteHeard.n + ' ' + noteHeard.l + ' ' + noteHeard.f;

        const firstUnplayedNote = findFirstUnplayedNote();
        if (firstUnplayedNote && noteHeard.n === firstUnplayedNote.n &&
            (rcs.octEq ? true : noteHeard.l === firstUnplayedNote.l)) {
          if (heardCnt >= rcs.heardCntReq) {
            lastPlayed.innerHTML = 'Correctly played: ' + noteHeard.n +
              ' ' + firstUnplayedNote.l + '=' + noteHeard.l;
            if (releaseWhenHeard || (tone && loopsCtr === 0)){
              releaseNoteAtTarget();
            }
          }
          numCorrect.innerHTML = heardCnt + '/' + rcs.heardCntReq;
          heardCnt++;
        }
      } else {
        console.warn('noteHeard not found: noteFreq=' + noteFreq);
      }
    }

		var detune = centsOffFromPitch( noteFreq, note );
		if (detune == 0 ) {
			detuneElem.className = "";
			detuneAmount.innerHTML = "--";
		} else {
			if (detune < 0)
				detuneElem.className = "flat";
			else
				detuneElem.className = "sharp";
			detuneAmount.innerHTML = Math.abs( detune );
		}
	}

	if (!window.requestAnimationFrame)
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	rafID = window.requestAnimationFrame( updatePitch );
}

//--------------------------------------------------------------

function createsNotesArrays() {
  // todo: add text field for a4 frequencies
  //const a4Freq = document.getElementById('frequency').value;
  const a4Freq = 440;
  // go down four octaves
  const a0 = a4Freq * Math.pow(1/2, 4);
  const TWELFTH_ROOT_OF_TWO = Math.pow(2, 1/12);
  const TWENTY_FOURTH_ROOT_OF_ONE_HALF = Math.pow(1/2, 1/24);
  let note, level, freq, ind;

  function roundTo(n, digits) {
      if (digits === undefined) { digits = 0; }
      const multiplier = Math.pow(10, digits);
      n = parseFloat((n * multiplier).toFixed(11));
      return Math.round(n) / multiplier;
  }

  // 89 go one note higher so array has the MINIMUM above the last 88th piano note
  for (let i=0; i<89; i++) {
    note = notes[(9 + i + 12) % 12];
    level = Math.floor((9 + i)/12);
    freq = a0*Math.pow(TWELFTH_ROOT_OF_TWO, i);

    notesMinimum.push({
      n: note,
      l: level,
      f: roundTo(freq * TWENTY_FOURTH_ROOT_OF_ONE_HALF, 2),
    });

    notesActual.push({
      n: note,
      l: level,
      f: roundTo(freq, 2),
      i,
    });
  }
}

function pad(freq) {
  stopPad(freq);

  let t = 0;
  var lnf = Math.log(freq);
  var peakScale = (0.0529162 * lnf - 0.785209) * lnf + 3.57215
  var decayScale = 0.15;

  var attack = 0.017;
  var peakTime = t + attack;
  var sawPeak = 0.44 * peakScale;
  var squarePeak = 0.5 * sawPeak;

  var filter = audioContext.createBiquadFilter();
  filter.connect(audioContext.destination);
  filter.frequency.value = 402;
  filter.detune.setValueAtTime(756, t);
  filter.detune.setTargetAtTime(0, peakTime, 2 * decayScale);

  var sawGain = audioContext.createGain();
  sawGain.connect(filter);
  sawGain.gain.setValueAtTime(0, t);
  sawGain.gain.linearRampToValueAtTime(sawPeak, peakTime);

  saw1 = audioContext.createOscillator();
  saw1.type = "sawtooth";
  saw1.frequency.value = 1.0035 * freq;
  saw1.connect(sawGain);
  saw1.start(t);

  saw2 = audioContext.createOscillator();
  saw2.type = "sawtooth";
  saw2.frequency.value = 0.9965 * freq;
  saw2.connect(sawGain);
  saw2.start(t);

  var squareGain = audioContext.createGain();
  squareGain.connect(filter);
  squareGain.gain.setValueAtTime(0, t);
  squareGain.gain.linearRampToValueAtTime(squarePeak, peakTime);

  square = audioContext.createOscillator();
  square.type = "square";
  square.frequency.value = freq;
  square.connect(squareGain);
  square.start(t);

  //console.log('pad ' + freq);
  padFreqs[freq] = [saw1, saw2, square];
}

function loopsStart(note) {
  loopNote = note;
  loopsCtr = rcs.loops;
  loopPadStart();
}
function loopPadStart() {
  let loopNoteIndex;
  if (rcs.octHigher) {
    loopNoteIndex = loopNote.i + 12;
  } else {
    loopNoteIndex = loopNote.i;
  }
  const loopFreq = notesActual[loopNoteIndex].f;
  stopPad(loopFreq); // just in case it was running already
  startPad(loopFreq);
  padTimerRestart = setTimeout(() => {
    loopPadStop(loopFreq);
  }, rcs.loopPlayTime);
}
function loopPadStop(loopFreq) {
  stopPad(loopFreq);
  loopsCtr--;
  if (loopsCtr > 0) {
    padTimerStop = setTimeout(() => {
      loopPadStart();
    }, rcs.loopPauseTime);
  } else if (rcs.listening === NONE) {
    releaseNoteAtTarget();
  }
}

function startPad(freq) {
  pad(freq);

  const stoTime = (rcs.chordOrArpg === 'chord' ? 0 :  rcs.loopPlayTime);
  let chordTones = 1; // 1 is to account for the root tone
  if (rcs.tone3) chordTones++;
  if (rcs.tone5) chordTones++;
  if (rcs.tone7) chordTones++;
  let playTone = 0;
  if (rcs.tone3) {
    const thirdFreq = calcIntervalFreq(freq, 2);
    playTone++;
    timeoutThird = setTimeout(() => {
      pad(thirdFreq);
    }, playTone * stoTime/chordTones ) ;
  }
  if (rcs.tone5) {
    const fifthFreq = calcIntervalFreq(freq, 4);
    playTone++;
    timeoutFifth = setTimeout(() => {
      pad(fifthFreq);
    }, playTone * stoTime/chordTones ) ;
  }
  if (rcs.tone7) {
    const seventhFreq = calcIntervalFreq(freq, 6);
    playTone++;
    timeoutSeventh = setTimeout(() => {
      pad(seventhFreq);
    }, playTone * stoTime/chordTones ) ;
  }
}

function stopPad(freq) {
  function stopFreq(f) {
    if (padFreqs[f]) {
      const oscs = padFreqs[f];
      oscs[2].stop();
      oscs[1].stop();
      oscs[0].stop();
      delete oscs[2];
      delete oscs[1];
      delete oscs[0];
      delete padFreqs[f];
    }
  }
  stopFreq(freq);
  // even if third and fifth are not on now those switches might
  // have been on when startPad was called, and user might have
  // turned off the switches while the sound was playing
  const thirdFreq = calcIntervalFreq(freq, 2);
  stopFreq(thirdFreq);
  const fifthFreq = calcIntervalFreq(freq, 4);
  stopFreq(fifthFreq);
  const seventhFreq = calcIntervalFreq(freq, 6);
  stopFreq(seventhFreq);
}

function stopPadAll() {
  for (const [freq, value] of Object.entries(padFreqs)) {
    //console.log(`${freq} ${value}`);
    stopPad(freq);
  }

  clearTimeout(padTimerRestart);
  clearTimeout(padTimerStop);
  clearTimeout(timeoutThird);
  clearTimeout(timeoutFifth);
  clearTimeout(timeoutSeventh);
}

function beep() {
  const beepGain = audioContext.createGain();
  beepGain.connect(audioContext.destination);

  const beep = audioContext.createOscillator();
  beep.type = "sine";
  beep.frequency.value = 300;
  beep.connect(beepGain);
  const now = audioContext.currentTime;
  beep.start(now);
  beep.stop(now + 0.204);
}

// among noteNamesInKey
function calcIntervalFreq(freq, distanceOfNotesInKey) {
    // get index of note for freq and get note
    const indexOfRoot = notesActual.findIndex(n => n.f === freq);
    const noteOfRoot = notesActual[indexOfRoot];
    if (noteOfRoot === undefined) return -1;
    // from that note name find the note the distance away
    const index = noteNamesInKey.findIndex(n => n === noteOfRoot.n);
    // index of it's fifth note
    const indexOfDistancedNote = (index + distanceOfNotesInKey) % noteNamesInKey.length;
    const noteName = noteNamesInKey[indexOfDistancedNote];
    const distancedNoteIndex = notesActual.findIndex(n => n.i > indexOfRoot && n.n === noteName);
    // return the frequency
    return notesActual[distancedNoteIndex].f;
}

function initIt() {
  inited = true;
  audioContext = new AudioContext();
  startAudioProcessing();
  startKeyBoardListening();
}

function startIt() {
  if (!inited) {
    initIt();
  }
  if (! animateRoll.isRunning()) {
    animateRoll.start();
  }
}

function stopIt() {
  animateRoll.stop();
  stopPadAll();
}

function startKeyBoardListening() {
  document.addEventListener('keyup', evt => {
    if (evt.key) {
      if (evt.key === ' ') {
        loopPadStart();
      } else if (evt.key === 'n') {
        releaseNoteAtTarget();
      } else if (evt.key === 's') {
        showNoteAtTarget();
      } else {
        const note = findFirstUnplayedNote();
        if (note && note.n.toLowerCase().indexOf(evt.key) > -1) {
          lastPlayed.innerHTML = 'Correctly keyed: ' + note.n;
          releaseNoteAtTarget();
        }
      }
    }
  });
}

