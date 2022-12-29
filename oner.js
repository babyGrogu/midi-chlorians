let octEq = true;
let amp = false;
let selectRangeLow = 2;
let selectRangeHigh = 34; 
let tone = true; // play tone when stopped at target
let releaseWhenHeard = false;
let chordOrArpg = 'chord'; // play fifth when stopped at target
let tone3 = false; // play third when stopped at target
let tone5 = true; // play fifth when stopped at target
let loops = 4; // num of loops
let loopPlayTime = 2345;
let loopPauseTime = 8;

//----------------- key board listener  --------------
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
//----------------- key board listeners -------------






//--------------------- react Controls --------------------
'use strict';

const { useState, useReducer, createElement } = React
const { createRoot } = ReactDOM;

const CMD_SET_INPUT = 'INPUT';
const CMD_SET_OCTEQ = 'OCTEQ';
const CMD_SET_AMP = 'AMP';
const CMD_SET_INST = 'INST';
const CMD_SET_KEY = 'KEY';
const CMD_SET_SLOWER = 'SLOWER';
const CMD_SET_FASTER = 'FASTER';
const CMD_SET_TONE = 'TONE';
const CMD_SET_RELEASE_WHEN_HEARD = 'RELEASE';
const CMD_SET_TONE3 = 'TONE3';
const CMD_SET_TONE5 = 'TONE5';
const CMD_SET_CHORD_OR_ARPG = 'CHORD_OR_ARPG';
const CMD_SET_LOOPS = 'LOOPS';
const CMD_SET_LOOP_PLAY_TIME = 'LOOP_PLAY_TIME';
const CMD_SET_LOOP_PAUSE_TIME = 'LOOP_PAUSE_TIME';
const CMD_RANGE_LOW = 'RANGE_LOW';
const CMD_RANGE_HIGH = 'RANGE_HIGH';



let initialControls = {
  input: selectInput,
  octEq,
  amp,
  instrument: INST_BASS4,
  key,
  rangeLow: 7,  // value of perfect note's  .i for BASS4
  rangeHigh: selectRangeHigh, // value of perfect note's  .i for BASS4
  velocity: animationVelocity,
  tone,
  releaseWhenHeard,
  tone3,
  tone5,
  chordOrArpg,
  loops,
};

let notesPerfectLowHighRange = [];

calculateLowHighRange(initialControls);
calculateNotesForKey(initialControls);

function calculateNotesForKey(state) {
  // figure out what notes are in the user specifed key
  // NOTE: noteNamesInKey might be better to be the note object rather than just the
  // names. If using notes that would make the
  noteNamesInKey = [];
  for (let i = notes.indexOf(state.key.root), j = 0;
       j < keySteps.length;
       i = (i + keySteps[j]) % notes.length, j++) {
    const noteInKey = notes[i];
    noteNamesInKey.push(noteInKey);
  }

  // for this key find the notes in range
  notesPerfectInKeyForRange.length = 0;
  notesPerfectLowHighRange.forEach(n => {
    if (noteNamesInKey.indexOf(n.n) > -1) {
      notesPerfectInKeyForRange.push(n);
    }
  });
}

// range can be affected by range selectors mainly
// other selectors that could be used could set ranges could be for instruments
// other selectors that could be used could set ranges could be for instrument frets
// keys should not effect range
function calculateLowHighRange(state) {
    // clone
    notesPerfectLowHighRange = [...notesPerfect];

    // find rangeLow's corresponding perfect note using .i
    const li = notesPerfectLowHighRange.findIndex(n => n.i === state.rangeLow);
    const hi = notesPerfectLowHighRange.findIndex(n => n.i === state.rangeHigh);
    notesPerfectLowHighRange = notesPerfectLowHighRange.slice(li, hi+1); 
}

const animateSpeed = (m) => animationVelocity = Math.round(animationVelocity * m);



function controlsReducer(state, action) {
  let newState = {};
  switch(action.command) {
    case (CMD_SET_KEY):
      state = {...state, key: keys[parseInt(action.key,10)]};
      calculateNotesForKey(state);
      key = state.key; // todo: when we get konva into react this line should go away
      renderLowestKeyNotes();
      action.target.blur(); // remove focus from widget so typing does not change selection
      return state;
    case (CMD_RANGE_LOW):
      newState = {...state, rangeLow: action.low};
      calculateLowHighRange(newState);
      calculateNotesForKey(newState);
      action.target.blur();
      return newState;
    case (CMD_RANGE_HIGH):
      newState = {...state, rangeHigh: action.high};
      calculateLowHighRange(newState);
      calculateNotesForKey(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_INPUT):
      return {...state, input: action.input};
    case (CMD_SET_OCTEQ):
      octEq = action.octEq; // todo: ...
      return {...state, octEq: action.octEq};
    case (CMD_SET_AMP):
      amp = action.amp; // todo: ...
      return {...state, amp: action.amp};
    case (CMD_SET_SLOWER):
      animateSpeed(0.95);
      return {...state, velocity: animationVelocity};
    case (CMD_SET_FASTER):
      animateSpeed(1.05);
      return {...state, velocity: animationVelocity};
    case (CMD_SET_TONE):
      tone = action.tone; // todo: when we get konva into react this line should go away
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, tone};
    case (CMD_SET_RELEASE_WHEN_HEARD):
      releaseWhenHeard = action.release; // todo: when we get konva into react this line should go away
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, releaseWhenHeard};
    case (CMD_SET_CHORD_OR_ARPG):
      chordOrArpg = action.chordOrArpg; // todo: ... into react this line should go away
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, chordOrArpg };
    case (CMD_SET_LOOPS):
      loops = action.loops; // todo: when we get konva into react this line should go away
      return {...state, loops};
    case (CMD_SET_TONE3):
      tone3 = action.tone3; // todo: when we get konva into react this line should go away
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, tone3: action.tone3};
    case (CMD_SET_TONE5):
      tone5 = action.tone5; // todo: when we get konva into react this line should go away
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, tone5: action.tone5};
    case (CMD_SET_LOOP_PLAY_TIME):
      loopPlayTime = action.loopPlayTime; // todo: ...
      return {...state, loopPlayTime: action.loopPlayTime};
    case (CMD_SET_LOOP_PAUSE_TIME):
      loopPauseTime = action.loopPauseTime; // todo: ...
      return {...state, loopPauseTime: action.loopPauseTime};
    case (CMD_SET_INST):
      // todo:
      return state;
  }
  return state;
}

const Controls = (props) => {
  const [controlData, dispatch] = useReducer(controlsReducer, initialControls);
  selectInput = controlData.input;
  loops = controlData.loops;

  function noteLabelForRange(str) {
    function sp(s, ss, i) {
      return (s.indexOf(ss) > -1) ? s.split(ss)[i]: str;
    }
    if (key.i === 0 ||
        key.i === 1 ||
        key.i === 2 ||
        key.i === 3 ||
        key.i === 4 ||
        key.i === 5 ||
        key.i === 6 ||
        key.i === 7) {
      str = sp(str, '=', 0);
      str = sp(str, '/', 1);
    }
    else if (key.i === 8 ||
             key.i === 9 ||
             key.i === 10 ||
             key.i === 11 ||
             key.i === 12 ||
             key.i === 13 ||
             key.i === 14) {
      str = sp(str, '=', 0);
      str = sp(str, '/', 0);
    }
    return str;
  }
  function noteLabelForKey(str) {
    function sp(s, ss, i) {
      return (s.indexOf(ss) > -1) ? s.split(ss)[i]: str;
    }
    // rewrite this using the logic in onek.js getStaffLine
    if (key.i === 0 ||
        key.i === 1 ||
        key.i === 2 ||
        key.i === 3 ||
        key.i === 4 ||
        key.i === 5 ) {
      str = sp(str, '=', 0);
      str = sp(str, '/', 1);
    } else if ( // handle enharmonic special cases
        key.i === 6 ||    //F#
        key.i === 7 ) {    //C#
      if (str === notes[11]) {
        str = sp(str, '=', 0);     // in key C# note C=B# is called B#
      } else {
        str = sp(str, '=', 1);     // in key F# note F=E# is called E#
      }
      str = sp(str, '/', 1);
    }
    else if (key.i === 8 ||
             key.i === 9 ||
             key.i === 10 ||
             key.i === 11 ||
             key.i === 12) {
      str = sp(str, '=', 0);
      str = sp(str, '/', 0);
    } else if ( // handle enharmonic special cases
             key.i === 13 ||
             key.i === 14) {
      if (str === notes[11] /*for Gb*/ || str === notes[4] /*for Cb*/) {
        str = sp(str, '=', 1);
      } else {
        str = sp(str, '=', 0);
      }
      str = sp(str, '/', 0);
    }
    return str;
  }
  function renderNotesForRangeSelection() {
    const notesForRangeSelectors = notesPerfect.slice(selectRangeLow, selectRangeHigh +1)
    return notesForRangeSelectors.map(n => {
      return (<option key={n.i} value={n.i}>{noteLabelForRange(n.n) + ' ' + n.l}</option>);
    });
  }
  function renderKeysForKeySelection() {
    return keys.map((k,i) => (
      <option key={i} value={i} label={k.label} />
    ));
  }
  function renderNotesForKey() {
    return noteNamesInKey.map((n,i) => ( <span key={i}>{noteLabelForKey(n)} </span> ));
    //return noteNamesInKey.map((n,i) => ( <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;<input type="checkbox" id={'noteInKeyCheck' + n} value={'noteInKeyCheck' + n} onChange={e => console.log('noteInKeyChecked ' + n)} /><span>{noteLabelForKey(n)}</span></span> ));
  }
  function listenR(e) {
    audioContext = new AudioContext();
    startAudioProcessing();
    startKeyBoardListening();
    eightIsGreate();
    e.target.blur(); // removes focus
  }

  return (
    <div>

      <div>
        <select id="selectRoot"
          value={keys.findIndex(k => k.label === controlData.key.label)}
          onChange={e =>
            dispatch({
              command: CMD_SET_KEY,
              key: e.currentTarget.value,
              target: e.currentTarget
            })
          }
        >{ renderKeysForKeySelection() }</select>
       <label> key: scale notes</label>
       <span> { renderNotesForKey() }</span>
      </div>

      <div>
        <select id="selectLow" value={controlData.rangeLow}
          onChange={e =>
            dispatch({
              command: CMD_RANGE_LOW,
              low: parseInt(e.currentTarget.value,10),
              target: e.currentTarget,
            })
          }
        >{ renderNotesForRangeSelection() }</select>
        <label> lowest note </label>
      </div>

      <div>
        <select id="selectHigh" value={controlData.rangeHigh}
          onChange={e =>
            dispatch({
              command: CMD_RANGE_HIGH,
              high: parseInt(e.currentTarget.value,10),
              target: e.currentTarget
            })
          }
        >
        >{ renderNotesForRangeSelection() }</select>
        <label> highest note </label>
      </div>

      <div>
        <input type="checkbox" id="octavesEqual" value="octavesEqual" checked={octEq} onChange={e =>
          dispatch({
            command: CMD_SET_OCTEQ,
            octEq: e.currentTarget.checked,
          })
        }/>
        <label htmlFor="octavesEqual">Octave notes are equal</label>
      </div>

      {/*
      <div>
        <select id="selectInst" value={controlData.instrument}
          onChange={e => 
            dispatch({
              command: CMD_SET_INST,
              inst: e.currentTarget.value
            })
          }
        >
        {
          Object.keys(instruments).map(inst => (
            <option key={inst} value={inst} label={instruments[inst].text} />
          ))
        }</select>
        <span> instrument </span>
      </div>
      */}

      <div>
        <select id="selectInput" onChange={e =>
            dispatch({
              command: CMD_SET_INPUT,
              input: e.currentTarget.value
            })
        }>
          <option value="cable">Instrument Cable (to USB)</option>
          <option value="mic">Microphone</option>
        </select>
        <label> input</label>

        <input type="checkbox" id="amp" value="amp" disabled={selectInput === 'mic'} 
          checked={amp} onChange={e => dispatch({
            command: CMD_SET_AMP,
            amp: e.currentTarget.checked,
          })
        }/>
        <label htmlFor="amp">Send input from cable to computer audio output</label>

      </div>

      <div>
        <button onClick={listenR}>start listening</button>
      </div>

      <div>
        <input type="checkbox" id="tone" value="tone" checked={tone} onChange={e =>
          dispatch({
            command: CMD_SET_TONE,
            tone: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="tone">Hear sound of chord / arpeggio at target </label>
      </div>

      <div>
        <input type="checkbox" id="release" value="release" checked={releaseWhenHeard} onChange={e =>
          dispatch({
            command: CMD_SET_RELEASE_WHEN_HEARD,
            release: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="release">Release note at target when a root note is "heard/sensed" for the required playCountReq, otherwise wait until after the "loop number" is done playing AND correct note is "heard/sensed" again</label>
        </div>

        <div>
        <input type="radio" name="chordOrArpg" id="chord" value="chord" checked={chordOrArpg === 'chord'} onChange={e =>
          dispatch({
            command: CMD_SET_CHORD_OR_ARPG,
            chordOrArpg: e.currentTarget.value,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="chord">chord </label>

        <input type="radio" name="chordOrArpg" id="arpg" value="arpg" checked={chordOrArpg === 'arpg'} onChange={e =>
          dispatch({
            command: CMD_SET_CHORD_OR_ARPG,
            chordOrArpg: e.currentTarget.value,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="arpg">arpeggio </label>

        <input type="checkbox" id="tone3" value="tone3" checked={tone && tone3} onChange={e =>
          dispatch({
            command: CMD_SET_TONE3,
            tone3: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="tone3">third </label>

        <input type="checkbox" id="tone5" value="tone5" checked={tone && tone5} onChange={e =>
          dispatch({
            command: CMD_SET_TONE5,
            tone5: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="tone5">fifth </label>

        <input type="number" id="loops" value={loops} onChange={e =>
          dispatch({
            command: CMD_SET_LOOPS,
            loops: parseInt(e.currentTarget.value,10),
          })
        }/>
        <label htmlFor="loops">loop number </label>

        <input type="number" id="loopPlayTime" value={loopPlayTime} onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PLAY_TIME,
            loopPlayTime: parseInt(e.currentTarget.value,10),
          })
        }/>
        <label htmlFor="loopPlayTime">loopPlayTime number </label>

        <input type="number" id="loopPauseTime" value={loopPauseTime} onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PAUSE_TIME,
            loopPauseTime: parseInt(e.currentTarget.value,10),
          })
        }/>
        <label htmlFor="loopPauseTime">loopPauseTime number</label>
      </div>

      <div>
        <button id="slower" onClick={() => dispatch({command: CMD_SET_SLOWER})}>Slower</button>
        <button id="faster" onClick={() => dispatch({command: CMD_SET_FASTER})}>Faster</button>
        <label> speed {controlData.velocity}</label>
      </div>

    </div>
  );
};

const domContainer = document.querySelector('#reactRoot');
const reactRoot = createRoot(domContainer);
reactRoot.render(<Controls />);

