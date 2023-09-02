
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var analyser = null;
let audioContext = null;
let MAX_SIZE = null;

var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array( buflen );


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
const keys = [   // todo: write a loop that creates this structure?
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

const CLEF_BASS = 'bass';
const CLEF_TREBLE = 'treble';
const INST_BASS4 = 'bass4';
const INST_BASS5 = 'bass5';
const INST_BASS6 = 'bass6';
const INST_GUITAR = 'guitar';
const INST_PIANO = 'piano';
const KEY_MAJOR_HALF_STEPS = [2,2,1,2,2,2,1];
const KEY_MINOR_HALF_STEPS = [2,1,2,2,1,2,2]
const ACTUAL = 'actual';
const MINIMUM = 'minimum';
const LOWER24 = Math.pow(1/2, 1/24);
const HIGHER24 = Math.pow(2, 1/24);
const noteMap = [];
const searchMiddle = 20;
const NONE = 'none';
const animateSpeed = (m) => animationVelocity = Math.round(animationVelocity * m);

let clef = CLEF_BASS;
let inst = INST_BASS4;
let keySteps = KEY_MAJOR_HALF_STEPS;
let chooseNoteTimer = -1;
let animationFramesCtr = 0;
let playedCnt = 0;
let playedCntReq = 23;
let pitchElem, noteElem, numCorrect, detuneElem, detuneAmount, lastPlayed;
let loopFreq, loopsCtr, padTimer;
let padFreqs = {};

let instruments = {
  // using javascript syntax for "computed keys"
  [INST_BASS4]: {
    text: 'bass (4 string, EADG)',
    //strings: ['E1','A1','D2','G2'],
    rangeActual: [7, 46],
  },
  [INST_BASS5]: {
    text: 'bass (5 string, BEADG)',
    //strings: ['B0','E1','A1','D2','G2'],
    rangeActual: [2, 46],
  },
  [INST_BASS6]: {
    text: 'bass (6 string, BEADGC)',
    //strings: ['B0','E1','A1','D2','G2', 'C3'],
    rangeActual: [2, 51],
  },
  [INST_GUITAR]: {
    text: 'guitar (6 string, EADGBE)',
    //strings: ['E2','A2','D3','G3','B4', 'E4'],
    rangeActual: [19, 67],
  },
  [INST_PIANO]: {
    text: 'piano (88 keys)',
    rangeActual: [0, 87],
  },
};

// arrays of notes
let notesActual, noteNamesInKey, notesActualInKeyForRange=[], notesMinimum, notesLow, notesHigh;


createNoteMap();

// onload handler has to be at top
window.onload = function () {

  // is this the best place to start all this?

	pitchElem = document.getElementById("pitch");
	noteElem = document.getElementById("note");
	numCorrect = document.getElementById("numCorrect");
	detuneElem = document.getElementById("detune");
	detuneAmount = document.getElementById("detune_amt");
	lastPlayed = document.getElementById("lastPlayed");
  initKonva();
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStreamWrapper(stream) {
  if (rcs.listening === 'mic') {
    // proceed to the old code
    gotStream(stream);
    return;
  }
  // seems like to use the cable we need to first have the user accept
  // using the microphone device and only after that we can see the USB cable
  // among numerateDevices, otherwise we don't see the USB device
  navigator.mediaDevices.enumerateDevices().then((devices) => {
    devices.forEach(device => {
      if (device.label.indexOf('USB ') > -1 && device.kind.indexOf('audioinput') > -1) {
        // todo: do we need to put this try-catch into a setTimeout
        // can two getUserMedia's be called recursively?
        // seems like this 'cable' method fails sometimes

        try {
  console.log('try ');
          navigator.getUserMedia(
            {audio: {deviceId: device.deviceId} }, gotStream, error);
        } catch (e) {
            alert('getting cable user media threw exception :' + e);
        }
        return;
      }
    });
  });
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

    // had to add this to get just the 'use live input' button to work
    // without using one of the other two buttons first
    audioContext.resume();

    updatePitch();
    beep();
}


function startAudioProcessing() {
  // no listening mode
  if (rcs.listening === NONE) {
    return;
  }

  getUserMedia({
    "audio": {
        "mandatory": {
            "googEchoCancellation": "false",
            "googAutoGainControl": "false",
            "googNoiseSuppression": "false",
            "googHighpassFilter": "false"
        },
        "optional": []
    },
  }, gotStreamWrapper);
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

    if (noteMap[0].f <= noteFreq && noteFreq < noteMap[noteMap.length-1].f) {
      let noteHeard = null;

      //-----------
      // this is an optimization which may not be needed at all...
      // rather than searching linearly through all the 88 notes, this splits them somewhere
      //   (now split is good for bass then later for guitar or piano)
      // and if freq is lower than the search point, go down notesLow
      // and if freq is higher than the split point, go up the notesHigh
      // - NOTE 1: for "real music" it may be better to just search from the last note played
      //   and go up or down from there
      // - NOTE 2: maybe none of this is needed and all 88 notes could be searched very fast
      if (noteFreq < notesHigh[0].f) {
        // notesLow has notes high to low
        // so the first note where the freq is higher is our note
        noteHeard = notesLow.find(note => noteFreq >= note.f );
      } else {
        // notesHigh has notes low to high
        // so find the first note where noteFreq is lower than the minimum of the next note
        // and then backup one note
        const ind = notesHigh.findIndex(note => noteFreq < note.f);
        noteHeard = notesHigh[ind-1];
      }
      //-----------

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
      }

      const leftMostNote = findLeftMostNoteToPlay();
      if (leftMostNote && noteHeard.n === leftMostNote.n &&
          (rcs.octEq ? true : noteHeard.l === leftMostNote.l)) {
        if (playedCnt >= playedCntReq) {
          lastPlayed.innerHTML = 'Correctly played: ' + noteHeard.n +
            ' ' + leftMostNote.l + '=' + noteHeard.l;
          if (releaseWhenHeard || (tone && loopsCtr === 0)){
            releaseNoteAtTarget();
          }
        }
        numCorrect.innerHTML = playedCnt + '/' + playedCntReq;
        playedCnt++;
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

function createNoteMap() {
  // todo: add text field for a4 frequencies
  //const a4Freq = document.getElementById('frequency').value;
  const a4Freq = 440;
  function createBasedOnA4Freq(a4Freq) {

    function roundTo(n, digits) {
        if (digits === undefined) { digits = 0; }
        var multiplicator = Math.pow(10, digits);
        n = parseFloat((n * multiplicator).toFixed(11));
        return Math.round(n) / multiplicator;
    }

    function addNote(note, level, freq, noteOrNot) {
      noteMap.push({
        //i: noteIndex, // added after all the notes have been created
        n: note,
        l: level,
        f: roundTo(freq,2),
        x: (noteOrNot ? ACTUAL : MINIMUM )
      });
    }

    // - twoNoteArray is INCLUSIVE, both notes and all in between are included
    // - to go lower in frequency give the highest note first
    function createNoteRange(twoNoteArray, level, lower) {
      const n1 = notes.indexOf(twoNoteArray[0]);
      const n2 = notes.indexOf(twoNoteArray[1]);
      let targetNotes;
      // going lower so reverse
      if (n1 <= n2) {
        // inclusive so add one to ending index
        targetNotes = notes.slice(n1, n2 + 1);
      } else {
        targetNotes = notes.slice(n2, n1 + 1).reverse();
      }
      targetNotes.forEach(note => {
        addNote(note, level, lastFreq, lower);
        lastFreq *= lower ? LOWER24 : HIGHER24;
        addNote(note, level, lastFreq, !lower);
        lastFreq *= lower ? LOWER24 : HIGHER24;
      });
    }

    let lastFreq = a4Freq;
    // going high to low from middle A4
    createNoteRange(['A','C=B#'], 4, true);
    createNoteRange(['B=Cb','C=B#'], 3, true);
    createNoteRange(['B=Cb','C=B#'], 2, true);
    createNoteRange(['B=Cb','C=B#'], 1, true);
    // piano low note is A0=27.50Hz
    createNoteRange(['B=Cb','A'], 0, true);

    noteMap.reverse();
    // going low to high above middle A4
    lastFreq = a4Freq * HIGHER24;
    createNoteRange(['Bb/A#','B=Cb'], 4, false);
    createNoteRange(['C=B#','B=Cb'], 5, false);
    createNoteRange(['C=B#','B=Cb'], 6, false);
    createNoteRange(['C=B#','B=Cb'], 7, false);
    // piano high note is C8=4186Hz
    createNoteRange(['C=B#','C=B#'], 8, false);
  }

  createBasedOnA4Freq(a4Freq);

  notesActual = noteMap.filter(item => item.x === ACTUAL);

  // add noteIndex 'i' value to each actual entry
  notesActual.forEach((n, i) => n.i = i);

  notesMinimum = noteMap.filter(item => item.x === MINIMUM);
  notesLow = notesMinimum.slice(0,searchMiddle).reverse();
  notesHigh = notesMinimum.slice(searchMiddle);
}

// TODO: need to set up a structure that for each frequeency it has a set
// of saws that can be started and stopped
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

  console.log('pad ' + freq);
  padFreqs[freq] = [saw1, saw2, square];
}

function loopPadStart(notesActualIndex) {
  if (rcs.octHigher) {
    notesActualIndex = notesActualIndex + 12;
  }
  let f = notesActual[notesActualIndex].f;
  stopPad(f);
  loopsCtr = rcs.loops;
  loopFreq = f;
  loopPadRestart();
}
function loopPadRestart() {
  startPad(loopFreq);
  padTimer = setTimeout(() => {
    loopPadStop();
  }, rcs.loopPlayTime);
}
function loopPadStop() {
  stopPad(loopFreq);
  loopsCtr--;
  if (loopsCtr > 0) {
    padTimer = setTimeout(() => {
      loopPadRestart();
    }, rcs.loopPauseTime);
  } else if (rcs.listening === NONE) {
    releaseNoteAtTarget();
  }
}

// if previously played a pad at this freq then stop them
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
    setTimeout(() => {
      pad(thirdFreq);
    }, playTone * stoTime/chordTones ) ;
  }
  if (rcs.tone5) {
    const fifthFreq = calcIntervalFreq(freq, 4);
    playTone++;
    setTimeout(() => {
      pad(fifthFreq);
    }, playTone * stoTime/chordTones ) ;
  }
  if (rcs.tone7) {
    const seventhFreq = calcIntervalFreq(freq, 6);
    playTone++;
    setTimeout(() => {
      pad(seventhFreq);
    }, playTone * stoTime/chordTones ) ;
  }
}

function stopPad(freq) {
  function stopFreq(f) {
    if (padFreqs[f]) {
      const oscs = padFreqs[f];
      oscs[0].stop();
      oscs[1].stop();
      oscs[2].stop();
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

// oops, something is wrong, stop all pads
function stopPadAll() {
  for (let f in padFreqs) {
    stopPad(parseInt(f,10));
  }
}

function beep() {
  const beepGain = audioContext.createGain();
  beepGain.connect(audioContext.destination);

  const beep = audioContext.createOscillator();
  beep.type = "sine";
  beep.frequency.value = 404;
  beep.connect(beepGain);
  const now = audioContext.currentTime;
  beep.start(now);
  beep.stop(now + 0.204);
}

// among noteNamesInKey
function calcIntervalFreq(freq, distanceOfNotesInKey) {
    // get index of note for loopFreq and get note
    const indexOfRoot = notesActual.findIndex(n => n.f === freq);
    const noteOfRoot = notesActual[indexOfRoot];
    if (noteOfRoot === -1) return -1;
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
  audioContext = new AudioContext();
  startAudioProcessing();
  startKeyBoardListening();
  eightIsGreate();
}

function startIt(inited) {
  if (!inited) {
    initIt();
  }
  animateRoll.start();
}

function stopIt() {
  animateRoll.stop();
}

function startKeyBoardListening() {
  document.addEventListener('keyup', evt => {
    if (evt.key && evt.key === ' ') {
      loopPadRestart();
    }
    else if (evt.key) {
      const leftMostNote = findLeftMostNoteToPlay();
      if (leftMostNote && leftMostNote.n.toLowerCase().indexOf(evt.key) > -1) {
        lastPlayed.innerHTML = 'Correctly keyed: ' + leftMostNote.n;
        releaseNoteAtTarget();
      }
    }
  });
}


/**
  todo:
    - add volume for roots, 3rds, 5ths, 7ths
    - add natural MINOR 15 scales (back 3 half steps from major, that is relative/natural minor)
    - add melodic MINOR 15 scales
    - add notes higher on the bass clef (beyond fret 12)
    - add a tooltip/mousetip above each note saying what each one represents(flats, sharps..)
    - add higher notes 9th? 11th? for chords
    - add harmonic MINOR 15 scales
    - add staff and key signature on staff
    - add chromatic (12 keys) (that will change the numberOfNotesInRange settings)
      - means adding konva sharps and flats (# for sharp keys, b for flats)
    - if mode not to stop then color notes green good / red bad
    - add select list for people to choose their device for their particular 'USB ' cable
    - add back the bass instrument 4,5,6 string range helper
    - put whole thing into web tool chain
       then konva can be used in react if that is ever needed
    - add spectro like this https://www.youtube.com/watch?v=eEeUFB1iIDo
*/
