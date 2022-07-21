
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var analyser = null;
let audioContext = null;
let MAX_SIZE = null;

var rafID = null;
var tracks = null;
var buflen = 2048;
var buf = new Float32Array( buflen );


const notes = ['C', 'Db/C#', 'D', 'Eb/D#', 'E', 'F', 'Gb/F#', 'G', 'Ab/G#', 'A', 'Bb/A#', 'B' ];

const CLEF_BASS = 'bass';
const CLEF_TREBLE = 'treble';
const INST_BASS4 = 'bass4';
const INST_BASS5 = 'bass5';
const INST_BASS6 = 'bass6';
const INST_GUITAR = 'guitar';
const INST_PIANO = 'piano';
const KEY_MAJOR_HALF_STEPS = [2,2,1,2,2,2,1];
const KEY_MINOR_HALF_STEPS = [2,1,2,2,1,2,2]
const PERFECT = 'perfect';
const MINIMUM = 'minimum';
const LOWER24 = Math.pow(1/2, 1/24);
const HIGHER24 = Math.pow(2, 1/24);
const noteMap = [];
const searchMiddle = 20;

let clef = CLEF_BASS;
let inst = INST_BASS4;
let keySteps = KEY_MAJOR_HALF_STEPS;
let root = notes[0]; //c
let chooseNoteTimer = -1;
let animationFramesCtr = 0;
let lastRandomNote = {n:-1}; 
let notePlayedCorrectlyCnt = 0;
let pitchElem, noteElem, detuneElem, detuneAmount, lastPlayed;
let selectInput = 'mic'; 
let selectRangeLow = 7
let selectRangeHigh = 27 

let instruments = {
  // using javascript syntax for "computed keys"
  [INST_BASS4]: {
    text: 'bass (4 string, EADG)',
    //strings: ['E1','A1','D2','G2'],
    rangePerfects: [7, 46],
  },
  [INST_BASS5]: {
    text: 'bass (5 string, BEADG)',
    //strings: ['B0','E1','A1','D2','G2'],
    rangePerfects: [2, 46],
  },
  [INST_BASS6]: {
    text: 'bass (6 string, BEADGC)',
    //strings: ['B0','E1','A1','D2','G2', 'C3'],
    rangePerfects: [2, 51],
  },
  [INST_GUITAR]: {
    text: 'guitar (6 string, EADGBE)',
    //strings: ['E2','A2','D3','G3','B4', 'E4'],
    rangePerfects: [19, 67],// not sure of these values
  },
  [INST_PIANO]: {
    text: 'piano (88 keys)',
    rangePerfects: [0, 88],// not sure of these values
  },
};

// arrays of notes
let notesPerfect, notesInKey, notesPerfectInKeyForInstAndRange=[], notesMinimum, notesLow, notesHigh;


createMap();

// onload handler has to be at top
window.onload = function () {

  // is this the best place to start all this?

	pitchElem = document.getElementById("pitch");
	noteElem = document.getElementById("note");
	detuneElem = document.getElementById("detune");
	detuneAmount = document.getElementById("detune_amt");
	lastPlayed = document.getElementById("lastPlayed");
  initKonva();
}

function getUserMedia(dictionary, callback) {

  function error() {
      alert('Stream generation failed.');
  }

  try {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        devices = devices.filter((d) => d.kind === 'audioinput');
        //console.log(devices);

        if (selectInput === 'cable') {
          //device 2 is the rocksmith or other amazon cable
          navigator.getUserMedia(
            {audio: {deviceId: devices[2].deviceId} }, callback, error);
        } else {
          // default mac microphone input
          navigator.getUserMedia(
            {audio: {deviceId: devices[1].deviceId} }, callback, error);
        }
      });

      // comment out this section if using the A2D cable
      /*
      navigator.getUserMedia = 
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;
      navigator.getUserMedia(dictionary, callback, error);
      */
  } catch (e) {
      alert('getting audio devices threw exception :' + e);
  }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );

    // had to add this to get just the 'use live input' button to work
    // without using one of the other two buttons first
    audioContext.resume();

    updatePitch();
}


function startAudioProcessing() {
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
  }, gotStream);
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
      let noteHeard = null

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
      //if (leftMostNote &&
      //    noteHeard.n === leftMostNote.n && noteHeard.l === leftMostNote.l) {
      // TODO: change later but for now make the notes level independant
      if (leftMostNote && noteHeard && noteHeard.n === leftMostNote.n) {
        if (notePlayedCorrectlyCnt >= 4) {
          notePlayedCorrectlyCnt = 0;
          // TODO: change later but for now make the notes level independant
          //lastPlayed.innerHTML = 'Correctly played: ' + noteHeard.n  + ' ' + noteHeard.l;
          lastPlayed.innerHTML = 'Correctly played: ' + noteHeard.n;
          notePlayedCorrectly();
        }
        notePlayedCorrectlyCnt++;
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

function createMap() {
  // todo: add text field for a4 frequencies
  //const a4Freq = document.getElementById('frequency').value;
  const a4Freq = 440;
  function createAup(a4Freq) {

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
        x: (noteOrNot ? PERFECT : MINIMUM )
      });
    }

    // twoNoteArray is INCLUSIVE, both notes and all in between are included
    // to go lower give the highest note first
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
    createNoteRange(['A','C'], 4, true);
    createNoteRange(['B','C'], 3, true);
    createNoteRange(['B','C'], 2, true);
    createNoteRange(['B','C'], 1, true);
    createNoteRange(['B','A'], 0, true);

    noteMap.reverse();
    lastFreq = a4Freq * HIGHER24;
    createNoteRange(['Bb/A#','B'], 4, false);
    // either just guitars
    createNoteRange(['C','E'], 5, false);

    // or piano range is A0=27.50Hz to C8=4186Hz
    //createNoteRange(['C','B'], 5, false);
    //createNoteRange(['C','B'], 6, false);
    //createNoteRange(['C','B'], 7, false);
    //createNoteRange(['C','C'], 8, false);

    //addNote('X', 'X', lastFreq*HIGHER24, false);

  }

  createAup(a4Freq);


  notesPerfect = noteMap.filter(item => item.x === PERFECT);

  // add noteIndex 'i' value to each perfect entry
  notesPerfect.forEach((n, i) => n.i = i);

  notesMinimum = noteMap.filter(item => item.x === MINIMUM);
  notesLow = notesMinimum.slice(0,searchMiddle).reverse();
  notesHigh = notesMinimum.slice(searchMiddle);
}

// todo: toggle listening?
function listen() {
  audioContext = new AudioContext();
  startAudioProcessing();
  eightIsGreate();
}

function chooseNote() {

  // slice inclusively
  //let keySlice = notesPerfectInKeyForInstAndRange.slice(selectRangeLow, selectRangeHigh+ 1);
  let choosenOne = lastRandomNote;
  // force the next random note be a different note than the previous value
  while (choosenOne.n === lastRandomNote.n) {
    const rand = Math.floor(Math.random()*(notesPerfectInKeyForInstAndRange.length));
    choosenOne = notesPerfectInKeyForInstAndRange[rand];
  }
  lastRandomNote = choosenOne;

  // add note to staff
  renderNote(choosenOne);

  /*
  renderNote(2);  //b
  renderNote(3);  //c
  renderNote(5);  //d
  renderNote(7);  //e
  renderNote(8);  //f
  renderNote(10); //g
  renderNote(12); //a
  renderNote(14); //b
  renderNote(15); //c
  renderNote(17); //d

  renderNote(19);
  renderNote(20);
  renderNote(22);
  renderNote(24);
  renderNote(26);
  renderNote(27);
  renderNote(29);
  renderNote(31);
  renderNote(32);
  renderNote(34);
  */
}

/**
  todo:
    - test changing the ranges for only the key of C
    - put up on github, mark git repo (alpha 0.1)
    - play for a while, yay!
    
    - write little program that loops through notes and lines and prints out
       where notes go
   for C                              for G
    bassClefNoteMap[24] =  6; //A2     bassClefNoteMap[24] =  6; //A2
    bassClefNoteMap[23] = -1;          bassClefNoteMap[23] = -1;
    bassClefNoteMap[22] =  7; //G2     bassClefNoteMap[22] =  7; //G2
    bassClefNoteMap[21] = -1;          bassClefNoteMap[21] =  8;  // Gb/F#2
    bassClefNoteMap[20] =  8; //F2     bassClefNoteMap[20] =  [8,9]; //F2
    bassClefNoteMap[19] =  9; //E2     bassClefNoteMap[19] =  9; //E2
    bassClefNoteMap[18] = -1;          bassClefNoteMap[18] = -1;
    bassClefNoteMap[17] = 10; //D2     bassClefNoteMap[17] = 10; //D2
    bassClefNoteMap[16] = -1;          bassClefNoteMap[16] = -1;
    bassClefNoteMap[15] = 11; //C2     bassClefNoteMap[15] = 11; //C2
    bassClefNoteMap[14] = 12; //B1     bassClefNoteMap[14] = 12; //B1
    bassClefNoteMap[13] = -1;          bassClefNoteMap[13] = -1;
    bassClefNoteMap[12] = 13; //A1     bassClefNoteMap[12] = 13; //A1
    bassClefNoteMap[11] = -1;          bassClefNoteMap[11] = -1;
    bassClefNoteMap[10] = 14; //G1     bassClefNoteMap[10] = 14; //G1
    start at root find default line #,
      to make it easy loop up by steps and assign lines
      then go through notes that don't have lines and assign them values

    - add key signature on staff
    - add MINOR
    - add chromatic (12 keys) (that will change the numberOfNotesInRange settings)
      - means adding konva sharps and flats (# for sharp keys, b for flats)
    - if mode not to stop then color notes green good / red bad
    - add byEar method
      - put X note(s) at target, play X note(s) repeatedly on beat (or  bar)
        wait for user to play that note (near the beat) for 2 or 3 or 4 (config) beats
      - see how many notes someone can get in a minute
    - figure out how to show sharps and flats in keys and ranges
    - fix interaction where user changes low/high range and then
       that setting is no longer in the key (no change of inst)
       - maybe add a flag for the low/high having been set
       - if current low/high setting is in new instKey data use it otherwise
         erate it and go to defualt for instKey (maybe notify user somehow, flash ele)
       - and/or maybe save the latest setting for both low and high
         and look for them after a new inst or key setting and if not
         there then what to do?
         then find (nearest higher note for low and nearest lower note for the high)?
         iff current low/high setting is diff from what the default low/high
         would be for this key and inst?
         - maybe this would be confusing because sometimes a user changing keys
           would get their low/high range be set to an old value they used
           for some other key
      - buglet: for 6 string and root G the F is not in the key so high
          range is F# which is 6th fret which is past the 5th which is what i want
          other keys do the same
          SO... this sort of thing may mean that making the ranges disregard
          the key setting, and elsewhere set the range to be just the key
          AND... disregarding would also get rid of the crazyness above about 
          what to do with low/hi range that is set that is no longer valid when
          key changes,
          AND... if someday we set range using the staff lines or a fretboard
          diagram, then these would also ignore the key

      //
    - put whole thing into web tool chain
       then konva can be used in react if that is ever needed
    - add a tooltip/mousetip above each note saying what each one represents
*/
