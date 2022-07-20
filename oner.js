'use strict';

const { useState, useReducer, createElement } = React
const { createRoot } = ReactDOM;

const CMD_SET_INPUT = 'SET_INPUT'
const CMD_SET_INST = 'SET_INST'
const CMD_SET_KEY = 'SET_KEY'
const CMD_RANGE_LOW = 'RANGE_LOW';
const CMD_RANGE_HIGH = 'RANGE_HIGH';

let initialControls = {
  input: selectInput,
  instrument: INST_BASS4,
  keyRoot: 'C',
  rangeLow: selectRangeLow,  // value of perfect note's  .i for BASS4
  rangeHigh: selectRangeHigh, // value of perfect note's  .i for BASS4
};

let notesPerfectInKeyForInst = [];

populateNotesForKeyAndInstrument(initialControls);
populateLowHighRangeGivenInstAndKey(initialControls);

function populateNotesForKeyAndInstrument(state) {
  // figure out what notes are in the user specifed key
  notesInKey = [];
  for (let i = notes.indexOf(state.keyRoot), j = 0;
       j < keySteps.length;
       i = (i + keySteps[j]) % notes.length, j++) {
    const noteInKey = notes[i];
    notesInKey.push(noteInKey);
  }

  // filter notes based on instrument
  let notesPerfectInst = notesPerfect.slice(
      instruments[state.instrument].rangePerfects[0],
      instruments[state.instrument].rangePerfects[1]+1
  );

  // for this instrument find the notes in key
  notesPerfectInKeyForInst.length = 0;
  notesPerfectInst.forEach(n => {
    if (notesInKey.indexOf(n.n) > -1) {
      notesPerfectInKeyForInst.push(n);
    }
  });
}

function populateLowHighRangeGivenInstAndKey(state) {
    notesPerfectInKeyForInstAndRange = [...notesPerfectInKeyForInst];
    // find rangeLow's corresponding perfect note using .i
    const li = notesPerfectInKeyForInstAndRange.findIndex(
      n => n.i === state.rangeLow);
    const hi = notesPerfectInKeyForInstAndRange.findIndex(
      n => n.i === state.rangeHigh);
    notesPerfectInKeyForInstAndRange =
      notesPerfectInKeyForInstAndRange.slice(li, hi+1); 

    /*
    let rangeLow, rangeHigh;
    if (state.instrument === INST_BASS4) {
      numberOfNotesInRange = 12;
    } else if (state.instrument === INST_BASS5) {
      numberOfNotesInRange = 15;
    } else if (state.instrument === INST_BASS6) {
      numberOfNotesInRange = 18;
    }

  
    rangeLow = notesPerfectInKeyForInst[0].i;
    rangeHigh = notesPerfectInKeyForInst[numberOfNotesInRange].i;
    return {...state, rangeLow, rangeHigh};
    */
}

function controlsReducer(state, action) {
  switch(action.command) {
    case (CMD_SET_KEY):
      state = {...state, keyRoot: action.key};
      populateNotesForKeyAndInstrument(state);
      populateLowHighRangeGivenInstAndKey(state);
      //state = populateLowHighRangeGivenInstAndKey(state);
      return state;
    case (CMD_RANGE_LOW):
      const newStateL = {...state, rangeLow: action.low};
      populateLowHighRangeGivenInstAndKey(newStateL);
      return newStateL;
    case (CMD_RANGE_HIGH):
      const newState = {...state, rangeHigh: action.high};
      populateLowHighRangeGivenInstAndKey(newState);
      return newState;
    case (CMD_SET_INST):
      state = {...state, instrument: action.inst};
      populateNotesForKeyAndInstrument(state);
      populateLowHighRangeGivenInstAndKey(state);
      //state = populateLowHighRangeGivenInstAndKey(state);
      return state;
    case (CMD_SET_INPUT):
      return {...state, input: action.input};
  }
  return state;
}


const Controls = (props) => {

  const [controlData, dispatch] = useReducer(controlsReducer, initialControls);

  selectInput = controlData.input;
  selectRangeLow = controlData.rangeLow;
  selectRangeHigh = controlData.rangeHigh;

  function renderNotesForRangeSelection() {
    let sharp = false;
    if (['C','D','E','G','A','B'].indexOf(controlData.keyRoot) > -1) {
      sharp = true;
    }
    return notesPerfectInKeyForInst.map(n => {
      let label;
      if (n.n.indexOf('/') > -1) {
        label = sharp ? n.n.slice(3,5) : n.n.slice(0,2);
      } else {
        label = n.n;
      }
      return (
        <option key={n.i} value={n.i} label={label + ' ' + n.l} />
      )
    });
  }

  function renderNotesForKeySelection() {
    return notes.map(n => (
      <option key={n} value={n} label={n} />
    ));
  }

  function listenR() {
    audioContext = new AudioContext();
    startAudioProcessing();
    eightIsGreate();
  }

  return (
    <div>

      {/*
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
      */}

      <div>
        <button onClick={listenR}>start listening</button>
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

      <div>
        <select id="selectRoot" value={controlData.keyRoot}
          onChange={e =>
            dispatch({
              command: CMD_SET_KEY,
              key: e.currentTarget.value
            })
          }
        >{ renderNotesForKeySelection() }</select>
       <span> key root </span>
      </div>
      */}

      {/*
      <div>
        <select id="selectScale">
          <option value="maj">major</option>
          <option value="min">minor</option>
          <option value="chr">chromatic</option>
        </select>
        scale
      </div>
      */}

      <div>
        <select id="selectLow" value={controlData.rangeLow}
          onChange={e =>
            dispatch({
              command: CMD_RANGE_LOW,
              low: parseInt(e.currentTarget.value,10)
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
              high: parseInt(e.currentTarget.value,10)
            })
          }
        >
        >{ renderNotesForRangeSelection() }</select>
        <span> highest note </span>
      </div>

      <div>
        <button id="slower" onClick={() => animateSlower()}>Slower</button>
        <button id="faster" onClick={() => animateFaster()}>Faster</button>
        <span> speed</span>
      </div>

    </div>
  );
};

const domContainer = document.querySelector('#reactRoot');
const reactRoot = createRoot(domContainer);
reactRoot.render(<Controls />);

