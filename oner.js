'use strict';

const { useState, useReducer, createElement } = React
const { createRoot } = ReactDOM;

const CMD_SET_INPUT = 'SET_INPUT'
const CMD_SET_INST = 'SET_INST'
const CMD_SET_KEY = 'SET_KEY'
const CMD_SET_SLOWER = 'SET_SLOWER';
const CMD_SET_FASTER = 'SET_FASTER';
const CMD_RANGE_LOW = 'RANGE_LOW';
const CMD_RANGE_HIGH = 'RANGE_HIGH';

let initialControls = {
  input: selectInput,
  instrument: INST_BASS4,
  key,
  rangeLow: 7,  // value of perfect note's  .i for BASS4
  rangeHigh: selectRangeHigh, // value of perfect note's  .i for BASS4
  velocity: animationVelocity
};

let notesPerfectLowHighRange = [];

calculateLowHighRange(initialControls);
calculateNotesForKey(initialControls);

function calculateNotesForKey(state) {
  // figure out what notes are in the user specifed key
  notesInKey = [];
  for (let i = notes.indexOf(state.key.root), j = 0;
       j < keySteps.length;
       i = (i + keySteps[j]) % notes.length, j++) {
    const noteInKey = notes[i];
    notesInKey.push(noteInKey);
  }

  // for this key find the notes in range
  notesPerfectInKeyForRange.length = 0;
  notesPerfectLowHighRange.forEach(n => {
    if (notesInKey.indexOf(n.n) > -1) {
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
    case (CMD_SET_INST):
      // todo:
      return state;
    case (CMD_SET_INPUT):
      return {...state, input: action.input};
    case (CMD_SET_SLOWER):
      animateSpeed(0.95);
      return {...state, velocity: animationVelocity};
    case (CMD_SET_FASTER):
      animateSpeed(1.05);
      return {...state, velocity: animationVelocity};
  }
  return state;
}

const Controls = (props) => {
  const [controlData, dispatch] = useReducer(controlsReducer, initialControls);
  selectInput = controlData.input;

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
    return notesInKey.map((n,i) => ( <span key={i}>{noteLabelForKey(n)} </span> ));
  }
  function listenR() {
    audioContext = new AudioContext();
    startAudioProcessing();
    startKeyBoardListening();
    eightIsGreate();
  }

  return (
    <div>

      <div>
        <select id="selectInput" onChange={e =>
            dispatch({
              command: CMD_SET_INPUT,
              input: e.currentTarget.value
            })
        }>
          <option value="mic">Microphone</option>
          <option value="cable">Instrument Cable (to USB)</option>
        </select>
        <span> input</span>
      </div>

      <div>
        <button onClick={listenR}>start listening</button>
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
        <span> lowest note </span>
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
        <span> highest note </span>
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
       <span> key: scale notes</span>
       <span> { renderNotesForKey() }</span>
      </div>

      <div>
        <button id="slower" onClick={() => dispatch({command: CMD_SET_SLOWER})}>Slower</button>
        <button id="faster" onClick={() => dispatch({command: CMD_SET_FASTER})}>Faster</button>
        <span> speed {controlData.velocity}</span>
      </div>

    </div>
  );
};

const domContainer = document.querySelector('#reactRoot');
const reactRoot = createRoot(domContainer);
reactRoot.render(<Controls />);

