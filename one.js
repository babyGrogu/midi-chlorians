// circle of fifths
// minor is the major circle rotated -90 degrees
//          major                   minor 
//          C=B#                      a
//      F=E#     G                 d     e
//    B♭/A#         D           g           b
//  E♭/D#             A       c               f♯  (there is no Gb minor use f♯)
//    A♭/G#       E=Fb          f           c♯  (there is no Db minor use c♯)
//      D♭/C♯   B=C♭             b♭/a♯  a♭/g♯
//          G♭/F♯                   e♭/d♯
//

//  '/' is used for common enharmonic notes used in common keys
//  '=' is used for more uncommon enharmonic notes like (B#) used in uncommon keys like C#
const NOTES = [
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
const KEYS = [
  {label: 'C Major',  root: NOTES[0],  i:0, },   // major, no sharps or flats
  {label: 'G Major',  root: NOTES[7],  i:1, },   // major sharps
  {label: 'D Major',  root: NOTES[2],  i:2, },
  {label: 'A Major',  root: NOTES[9],  i:3, },
  {label: 'E Major',  root: NOTES[4],  i:4, },
  {label: 'B Major',  root: NOTES[11], i:5, },
  {label: 'F# Major', root: NOTES[6],  i:6, },
  {label: 'C# Major', root: NOTES[1],  i:7, },
  {label: 'F Major',  root: NOTES[5],  i:8, },   // major flats
  {label: 'Bb Major', root: NOTES[10], i:9, },
  {label: 'Eb Major', root: NOTES[3],  i:10 },
  {label: 'Ab Major', root: NOTES[8],  i:11 },
  {label: 'Db Major', root: NOTES[1],  i:12 },
  {label: 'Gb Major', root: NOTES[6],  i:13 },
  {label: 'Cb Major', root: NOTES[11], i:14 },

  {label: 'A Minor',  root: NOTES[9],  i:15 },  // minor, no sharps or flats
  {label: 'E Minor',  root: NOTES[4],  i:16 },  // minor sharps
  {label: 'B Minor',  root: NOTES[11], i:17 },
  {label: 'F# Minor', root: NOTES[6],  i:18 },
  {label: 'C# Minor', root: NOTES[1],  i:19 },
  {label: 'G# Minor', root: NOTES[8],  i:20 },
  {label: 'D# Minor', root: NOTES[3],  i:21 },
  {label: 'A# Minor', root: NOTES[10], i:22 },
  {label: 'D Minor',  root: NOTES[2],  i:23 },  // minor flats
  {label: 'G Minor',  root: NOTES[7],  i:24 },
  {label: 'C Minor',  root: NOTES[0],  i:25 },
  {label: 'F Minor',  root: NOTES[5],  i:26 },
  {label: 'Bb Minor', root: NOTES[10], i:27 },
  {label: 'Eb Minor', root: NOTES[3],  i:28 },
  {label: 'Ab Minor', root: NOTES[8],  i:29 },
];


//const CLEF_BASS = 'bass';
//const CLEF_TREBLE = 'treble';
const MAJOR_SCALE_HALF_STEPS = [2,2,1,2,2,2,1];
const MINOR_SCALE_HALF_STEPS = [2,1,2,2,1,2,2]
const CHROMATIC_SCALE_HALF_STEPS = [1,1,1,1,1,1,1,1,1,1,1,1]
const NONE = 'none';

const LOCAL_STORAGE_KEY = 'babyGrogu';
const FUNC_RANDO = 'RANDO';
const FUNC_ASC = 'ASC';
const FUNC_DESC = 'DESC';

const RUN_MODE_CNR = 'C&R';
const RUN_MODE_STOPONNOTE = 'OLDSTYLE';
const RUN_MODE_STARTED = 'STARTED';
const RUN_MODE_CONTINUOUS = 'CONTINUOUS';

// keep defaultState to one level of nested objects so the localStorage of ui settings will work
const defaultState = {
  input: NONE,
  octEq: false,
  octHigher: false,
  amp: false,
  hide: false,
  chromatic: 0, // 1 means show all notes
  key: 0, // 0 = C major
  rangeLow: 2,
  rangeHigh: 34,
  animationVelocity: 123,
  tone: true, // play tone when stopped at target
  tone3: false, // play the third
  tone5: false, // play the fifth
  tone7: false, // play the seventh
  chordOrArpg: 'chord', // the selected tones 3,5,7 as a chord or as an arpegio
  loops: 1,
  loopPlayTime: 800,
  loopPauseTime: 0,
  detectedTriggerThreshold: 23,
  detectedTrigger: false,
  detectedShowKonvaNote: false,
  beep: false,
  func: FUNC_RANDO,
  skip: {},
  runMode: false,
};
let started = false;
let initialState;
let notesActualInKeyForRange = [];


let keySteps = MAJOR_SCALE_HALF_STEPS;
let chooseNoteTimer = -1;
//let animationFramesCtr = 0;
let detectedThresholdCnt = 0;
let hertzElem, noteElem, detectedEle, detuneElem, detuneAmount, lastPlayed;
let loopNote, loopsCtr, timeoutRoot, timeoutPadPauseUntilLoopRestart, timeoutThird, timeoutFifth, timeoutSeventh;
let padOscillatorsAtFreq = {};

// arrays of notes
let notesActual = [], notesMinimum = [], noteNamesInKey = [], noteNamesChromaticForKey = [];

// webaudio variables
let analyser = null;
let audioContext = null;
let rafID = null;
let bufferScale = 2; // 2 seems best for lowish E1-B1 notes when played on B string
// when E1-B1 notes played on B string the fundamental disapears quickly and the E2-B2
// overtones are more very soon louder!
let bufferAnalyserData = new Float32Array(2048 * bufferScale); // must be multiples of 2048


// onload handler has to be at top
window.onload = function () {
  hertzElem = document.getElementById("hertz");
  noteElem = document.getElementById("note");
  detectedEle = document.getElementById("detected");
  detuneElem = document.getElementById("detune");
  detuneAmount = document.getElementById("detune_amt");
  lastPlayed = document.getElementById("lastPlayed");

  createNotesArrays();
  createBassClefKeySignatures();

  const localStoreData = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
  initialState = {...defaultState, ...localStoreData};
  setUpKey(initialState);
  setNoteFunction(initialState);

  // is this the best place to start all this?
  initKonva(initialState.key);
}

async function startAudioListening() {

  async function gotStream(stream) {

    // Resume context if browser suspended it
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = bufferAnalyserData.length;

    // Connect analyser to the destination.
    mediaStreamSource.connect(analyser);
    if (rcs.amp) {
      analyser.connect(audioContext.destination);
    }
    updatePitch();
  }

  try {
    // Create AudioContext only once
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // microphone input
    if (rcs.input === 'mic') {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // with echo false it listens to itself and if sensing
          // will trigger itself
          echoCancellation: true,
          autoGainControl: false,
          noiseSuppression: false
        }
      });

      await gotStream(stream);
    }

    // specific usb audio device
    else if (rcs.input === 'cable') {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const usbDevice = devices.find(device =>
        device.kind === 'audioinput' &&
        device.label.includes('KATANA:GO AUDIO')
      );

      if (!usbDevice) {
        throw new Error('USB audio device not found.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: {
            exact: usbDevice.deviceId
          }
        }
      });

      await gotStream(stream);
    }
  } catch (err) {
    console.error(`${err.name}: ${err.message}`);
    started = false; forceReactUpdateTrick();
    alert('Stream generation failed.');
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
      
// timestamp is the number of milliseconds since the page's time origin
//   (similar to performance.now()).
function updatePitch(/* timestamp */) {

  // TODO: ?? make a ui widget
  const trigger = 2; // B0, 27hz, nm#2 i can't beleive this works!

	analyser.getFloatTimeDomainData(bufferAnalyserData);
	var noteFreq = autoCorrelate(bufferAnalyserData, audioContext.sampleRate);

  //animationFramesCtr++;
 	if (noteFreq == -1) {
	 	  hertzElem.innerText = "--";
		  noteElem.innerText = "--";
		  detuneAmount.innerText = "--";
 	} else {
	 	hertzElem.innerText = Math.round( noteFreq ) ;

    // this is our test range for respond
    if (rcs.runMode === RUN_MODE_CNR
        && notesMinimum[trigger].f <= noteFreq
        && noteFreq < notesMinimum[trigger+1].f
        && ! rcs.detectedTrigger) {
      respondTriggered();
      beepBeep();
    }

    // if the frequency seen is in our UI set range limits...
    if (started
      && notesMinimum[0].f <= noteFreq
      && noteFreq < notesActual[notesActual.length-1].f
    ) {
      const noteDetected = binarySearch(noteFreq);
      if (noteDetected) {
        if (rcs.hide) {
	 	      //const note = noteFromPitch( noteFreq );
      		//noteElem.innerHTML = NOTES[note%12];
          noteElem.innerHTML = ' ';
          detectedEle.innerHTML = ' ';
        } else  {
          noteElem.innerHTML = getLabelForNote(noteDetected.n) + ' ' + noteDetected.l;
        }

        if (rcs.detectedShowKonvaNote) {
          renderDetectedKonvaNote(noteDetected);
        }

        if (rcs.runMode === RUN_MODE_CNR || rcs.runMode === RUN_MODE_STOPONNOTE) {
          const firstUnplayedNote = findFirstUnplayedNote();

          if (firstUnplayedKonvaNoteInTarget()
            && rcs.detectedTrigger
            && firstUnplayedNote
            && noteDetected.n === firstUnplayedNote.n
            && (rcs.octEq ? true : noteDetected.l === firstUnplayedNote.l)) {

            if (rcs.detectedTrigger) detectedThresholdCnt++;
            if (rcs.detectedTrigger && detectedThresholdCnt >= rcs.detectedTriggerThreshold) {
              detectedThresholdCnt = 0;
              releaseNoteAtTarget();
              if (rcs.runMode === RUN_MODE_CNR) {
                dispatchRef({command: CMD_SET_DETECTED_TRIGGER, detectedTrigger: false});
              }
            }
          }

          if (rcs.detectedTrigger) {
            const thresh =
              (rcs.detectedTrigger) ? ' Threshold: ' + rcs.detectedTriggerThreshold : '';
            detectedEle.innerHTML = 'Detected: ' + detectedThresholdCnt + thresh;
          }
          else if (rcs.runMode === RUN_MODE_CNR) {
            detectedEle.innerHTML = 'Press Respond when ready';
          }
        }
      } else {
        console.warn('noteDetected not found: noteFreq=' + noteFreq);
      }
    }

  const note = noteFromPitch( noteFreq );
  const detune = centsOffFromPitch( noteFreq, note );
  if (detune == 0) {
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
  // requestAnimationFrame means
  //  " run this function (updatePitch) right before the next screen repaint"
  // this syncs up that function with the screen refresh rate
  rafID = window.requestAnimationFrame( updatePitch );
}

//--------------------------------------------------------------

function createNotesArrays() {

  const a4Freq = 440;
  // go down four octaves from a4
  const a0Freq = a4Freq * Math.pow(1/2, 4);
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
    note = NOTES[(9 + i) % 12];
    level = Math.floor((9 + i)/12);
    freq = a0Freq*Math.pow(TWELFTH_ROOT_OF_TWO, i);

    notesMinimum.push({
      n: note,
      l: level,
      f: roundTo(freq * TWENTY_FOURTH_ROOT_OF_ONE_HALF, 2),
      i,
    });

    notesActual.push({
      n: note,
      l: level,
      f: roundTo(freq, 2),
      i,
    });
  }
}

function calculateNoteNamesInKey(keyNum, chromatic) {
  const noteNamesInKeyLocal = [];
  let steps;
  if (chromatic) steps = CHROMATIC_SCALE_HALF_STEPS
  else steps = keyNum < 15 ? MAJOR_SCALE_HALF_STEPS: MINOR_SCALE_HALF_STEPS;

  // figure out what notes names are in the key
  for (let i = NOTES.indexOf(KEYS[keyNum].root), j = 0;
       j < steps.length;
       i = (i + steps[j]) % NOTES.length, j++) {
    const noteInKey = NOTES[i];
    noteNamesInKeyLocal.push(noteInKey);
  }
  return noteNamesInKeyLocal;
}

function createBassClefKeySignatures() {

  function makeOrder(startKey, endKey, accidentalPosition, accRange) {
    const order = []; // order of accidentals
    for (let i=startKey; i<endKey; i++) {
      const noteNamesInKeyLocal = calculateNoteNamesInKey(i, false);
      const accidentalName = noteNamesInKeyLocal[accidentalPosition];
      const accNote = accRange.find(n => n.n === accidentalName);
      order.push(accNote);
      const newOrder = [...order];
      KEYS[i].acc = newOrder;
      KEYS[i+15].acc = newOrder;  // relative minor key has same accidentals
    }
  }

  // sharp signatures range on staff line from A1 to G2
  let accidentalSigRange = notesActual.slice(12, 24);
  KEYS[0].acc = [];
  makeOrder(1, 8, 6, accidentalSigRange);

  // flat signatures range on staff line from F1 to E2
  accidentalSigRange = notesActual.slice(7, 20);
  KEYS[15].acc = [];
  makeOrder(8, 15, 3, accidentalSigRange);
}

function pad(freq) {
  stopOscsFromRoot(freq);

  let t = 0;
  var lnf = Math.log(freq);
  var peakScale = (0.0529162 * lnf - 0.785209) * lnf + 3.57215
  var decayScale = 0.15;

  var attack = 0.017;
  var peakTime = t + attack;
  var volume = 0.2;  // TODO: make into a slider in jsx
  var sawPeak = 0.44 * peakScale * volume;
  var squarePeak = 0.5 * sawPeak * volume;


  var filter = audioContext.createBiquadFilter();
  filter.type = "lowpass"; // this is the default
  filter.Q.value = 0.7; // creates a gentle roll off at frequence.value
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
  padOscillatorsAtFreq[freq] = [saw1, saw2, square];
}

function startLooping(note) {
  loopNote = note;
  loopsCtr = rcs.loops; forceReactUpdateTrick();
  oneLoopPadStart();
}

function stopLoopingTimers() {
  clearTimeout(timeoutRoot);
  clearTimeout(timeoutPadPauseUntilLoopRestart);
  clearTimeout(timeoutThird);
  clearTimeout(timeoutFifth);
  clearTimeout(timeoutSeventh);
}

function findLoopNoteFreq() {
  if (!loopNote) return;
  let loopNoteIndex;
  if (rcs.octHigher) {
    loopNoteIndex = loopNote.i + 12;
  } else {
    loopNoteIndex = loopNote.i;
  }
  const loopFreq = notesActual[loopNoteIndex].f;
  return loopFreq;
}

function stopCurrentNotePad() {
  const loopFreq = findLoopNoteFreq();
  stopOscsFromRoot(loopFreq); // just in case it was running already
}

function oneLoopPadStart() {
  const loopFreq = findLoopNoteFreq();
  stopOscsFromRoot(loopFreq); // just in case it was running already
  startPad(loopFreq);
  timeoutRoot = setTimeout(() => {
    oneLoopPadStop(loopFreq);
  }, rcs.loopPlayTime);
}

function oneLoopPadStop(loopFreq) {
  stopOscsFromRoot(loopFreq);
  loopsCtr--; forceReactUpdateTrick();
  timeoutPadPauseUntilLoopRestart = setTimeout(() => {
    // if loopsCtr is above 0 then restart the loop
    if (loopsCtr > 0) {
      oneLoopPadStart();
    }
    else if (rcs.runMode === RUN_MODE_CONTINUOUS) {
      // this lets the roll play by itself at the end of looping
      releaseNoteAtTarget();
    }
  }, rcs.loopPauseTime);
}

function startPad(freq) {
  if (rcs.tone)
    pad(freq);
  else
    return;
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

// stops all all 3 oscillators at each frequency (root, 3rd, 5th & 7th)
function stopOscsFromRoot(freq) {
  function stopOscillatorsAtFreq(f) {
    if (padOscillatorsAtFreq[f]) {
      const oscs = padOscillatorsAtFreq[f];
      oscs[2].stop();
      oscs[1].stop();
      oscs[0].stop();
      delete oscs[2];
      delete oscs[1];
      delete oscs[0];
      delete padOscillatorsAtFreq[f];
    }
  }
  stopOscillatorsAtFreq(freq);
  // even if third and fifth are not on now those switches might
  // have been on when startPad was called, and user might have
  // turned off the switches while the sound was playing
  const thirdFreq = calcIntervalFreq(freq, 2);
  stopOscillatorsAtFreq(thirdFreq);
  const fifthFreq = calcIntervalFreq(freq, 4);
  stopOscillatorsAtFreq(fifthFreq);
  const seventhFreq = calcIntervalFreq(freq, 6);
  stopOscillatorsAtFreq(seventhFreq);
}

function stopPadAll() {
  for (const [freq, value] of Object.entries(padOscillatorsAtFreq)) {
    stopOscsFromRoot(freq);
  }
}

function beep() {
  const beepGain = audioContext.createGain();
  beepGain.connect(audioContext.destination);
  beepGain.gain.value = 0.23;

  const beep = audioContext.createOscillator();
  beep.type = "sine";
  beep.frequency.value = 300;
  beep.connect(beepGain);
  const now = audioContext.currentTime;
  beep.start(now);
  beep.stop(now + 0.204);
}
function beepBeep() {
  beep();
  setTimeout(() => {
    beep();
  }, 300);
}

// among noteNamesInKey not for all chromatic notes
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

// TODO: ask ai how to use keyboard listeners with react and dispatch
//       remove this init if keyboard listeners work with react
function startDetecting() {

  if (started) {
    return true;
  }

  // no input
  if (rcs.input === NONE) {
    alert('no input selected');
    return false;
  }

  started = true; forceReactUpdateTrick();
  startAudioListening();
  startKeyBoardListening();
}

function startAnimation() {
  if (!started) {
    const r = startDetecting();
    if (!r) return; // don't start animation
  }
  if (! animateRoll.isRunning()) {
    animateRoll.start();
  }
}

function restartAnimation() {
  if (! animateRoll.isRunning()) {
    animateRoll.start();
  }
}

function movingToNextNote() {
  stopPadAll();
  stopLoopingTimers();
  detectedThresholdCnt = 0;
  loopsCtr = 0; forceReactUpdateTrick();
  //detectedEle.innerHTML = '';
}

function playNoteAtTarget() {
  stopPadAll();
  stopLoopingTimers();
  oneLoopPadStart();
}

function stopIt() {
  animateRoll.stop();
  stopPadAll();
  stopLoopingTimers();
  detectedThresholdCnt = 0;
  detectedEle.innerHTML = '';
  loopsCtr = 0; // subsequent lines call dispatchRef // forceReactUpdateTrick(); 
  rcs.runMode = false; // subsequent lines call dispatchRef // forceReactUpdateTrick(); 
  dispatchRef({command: CMD_SET_DETECTED_TRIGGER, detectedTrigger: false});
  dispatchRef({command: CMD_SET_SHOW_DETECTED_NOTEK, detectedShowKonvaNote: false});
}

function respondTriggered() {
  dispatchRef({command: CMD_SET_CNR_RESPOND});
}

function respond() {
  stopCurrentNotePad();
  stopLoopingTimers();
  loopsCtr = 0; forceReactUpdateTrick();
  detectedEle.innerHTML = 'Play something!';
}

function setUpKey(state) {
  noteNamesInKey = calculateNoteNamesInKey(state.key, false);
  noteNamesChromaticForKey =  calculateNoteNamesInKey(state.key, true);
  const notesSelected = (state.chromatic) ? noteNamesChromaticForKey : noteNamesInKey;

  // for the key note names, find the notes in range
  notesActualInKeyForRange.length = 0;

  const notesActualLowHighRange = notesActual.slice(state.rangeLow, state.rangeHigh+1); 
  notesActualLowHighRange.forEach(n => {
    if (notesSelected.indexOf(n.n) > -1) {
      notesActualInKeyForRange.push(n);
    }
  });
}

function setNoteFunction(state) {
  if (state.func === FUNC_RANDO) {
    animateNoteFunction = generateRandomNote;
  }
  if (state.func === FUNC_ASC) {
    animateNoteFunction = generateAscendingKeyNote;
  }
  if (state.func === FUNC_DESC) {
    animateNoteFunction = generateDescendingKeyNote;
  }
}

function startKeyBoardListening() {
  document.addEventListener('keyup', evt => {
    if (evt.key) {
      if (evt.key === ' ') {
        playNoteAtTarget();
      } else if (evt.key === 'n') {
        releaseNoteAtTarget();
      } else if (evt.key === 's') {
        showNoteAtTarget();
      } else if (evt.key === 'r') {
        respondTriggered();
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
 
