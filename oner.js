'use strict';

const { useReducer, createElement, useEffect } = React
const { createRoot } = ReactDOM;

const CMD_SET_INITED = 'INITED';
const CMD_RESET = 'RESET';
const CMD_SET_INPUT = 'LISTENING';
const CMD_SET_OCTEQ = 'OCT_EQ';
const CMD_SET_OCT_HIGHER = 'OCT_HIGHER';
const CMD_SET_AMP = 'AMP';
const CMD_SET_HIDE = 'HIDE';
const CMD_SET_INST = 'INST';
const CMD_SET_KEY = 'KEY';
const CMD_SET_VELOCITY = 'VELOCITY';
const CMD_SET_TONE = 'TONE';
const CMD_SET_RELEASE_WHEN_HEARD = 'RELEASE';
const CMD_SET_TONE3 = 'TONE3';
const CMD_SET_TONE5 = 'TONE5';
const CMD_SET_TONE7 = 'TONE7';
const CMD_SET_CHORD_OR_ARPG = 'CHORD_OR_ARPG';
const CMD_SET_LOOPS = 'LOOPS';
const CMD_SET_LOOP_PLAY_TIME = 'LOOP_PLAY_TIME';
const CMD_SET_LOOP_PAUSE_TIME = 'LOOP_PAUSE_TIME';
const CMD_RANGE_LOW = 'RANGE_LOW';
const CMD_RANGE_HIGH = 'RANGE_HIGH';
const CMD_SET_PLAY_CNT_REQ = 'PLAY_CNT_REQ';

const changeAnimationVelocity = (m) => Math.round(rcs.animationVelocity * m);

let rcs = {}; // reducer controlled state
let notesActualLowHighRange = [];

// keep rcs flat (no nested objects) so the simple localStorage of ui settings will work
const defaultState = {
  listening: NONE,
  octEq: false,
  octHigher: false,
  amp: false,
  hide: false,
  //instrument: INST_BASS4,
  key: 0, // 0 = C major
  rangeLow: 7,  // value of notesActual for BASS4
  rangeHigh: 34, // value of notesActual for BASS4
  animationVelocity: 420,
  tone: true, // play tone when stopped at target
  releaseWhenHeard: false,
  tone3: false, // play the third
  tone5: false, // play the fifth
  tone7: false, // play the seventh
  chordOrArpg: 'chord', // the selected tones 3,5,7 as a chord or as an arpegio
  loops: 1,
  loopPlayTime: 800,
  loopPauseTime: 200,
  heardCntReq: 23,
};
const LOCAL_STORAGE_KEY = 'babyGrogu';
const localStoreData = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
let changes;
if (localStoreData) {
  changes = findChangesFromDefault(localStoreData);
}
const initialState = {...defaultState, ...changes};

calculateLowHighRange(initialState);
calculateNotesForKey(initialState);

function findChangesFromDefault(obj) {
  const c = {};
  for (const [k, v] of Object.entries(defaultState)) {
    const lsdv = obj[k];
    if (lsdv !== undefined && lsdv !== v) {
      c[k] = lsdv;
    }
  }
  return c;
}

// changing keys should not effect range
// a control for instruments could affect the ranges
// a control for frets could affect the ranges
function calculateLowHighRange(state) {
    // clone
    notesActualLowHighRange = [...notesActual];

    // find rangeLow's corresponding actual note using .i
    const li = notesActualLowHighRange.findIndex(n => n.i === state.rangeLow);
    const hi = notesActualLowHighRange.findIndex(n => n.i === state.rangeHigh);
    notesActualLowHighRange = notesActualLowHighRange.slice(li, hi+1); 
}

function calculateNotesForKey(state) {
  // figure out what notes are in the user specifed key
  // NOTE: noteNamesInKey might be better to be the note object rather than just the
  // names. If using notes that would make the
  noteNamesInKey = [];
  for (let i = notes.indexOf(keys[state.key].root), j = 0;
       j < keySteps.length;
       i = (i + keySteps[j]) % notes.length, j++) {
    const noteInKey = notes[i];
    noteNamesInKey.push(noteInKey);
  }

  // for this key find the notes in range
  notesActualInKeyForRange.length = 0;
  notesActualLowHighRange.forEach(n => {
    if (noteNamesInKey.indexOf(n.n) > -1) {
      notesActualInKeyForRange.push(n);
    }
  });
}

function noteLabelForRange(str, key) {
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

function noteLabelForKey(str, key) {
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

function renderNotesForRangeSelection(key) {
  const notesForRangeSelectors = notesActual.slice(2, 34+1); // 2=B0 , 34=G3
  return notesForRangeSelectors.map(n => {
    return (<option key={n.i} value={n.i}>{noteLabelForRange(n.n, key) + ' ' + n.l}</option>);
  });
}

function renderKeysForKeySelection() {
  return keys.map((k,i) => (
    <option key={i} value={i} label={k.label} />
  ));
}

function renderNotesForKey(k) {
  return noteNamesInKey.map((n,i) => ( <span key={i}>{noteLabelForKey(n,k)} </span> ));
  //return noteNamesInKey.map((n,i) => ( <span key={i}>&nbsp;&nbsp;&nbsp;&nbsp;<input type="checkbox" id={'noteInKeyCheck' + n} value={'noteInKeyCheck' + n} onChange={e => console.log('noteInKeyChecked ' + n)} /><span>{noteLabelForKey(n,k)}</span></span> ));
}

// does not handle nested objects, keep rcs flat
function changesFromDefaults(current) {
  if (current === undefined) return null;
  let changed = {};
  for (const k of Object.keys(defaultState)) {
    if (defaultState[k] !== current[k] && current[k] !== undefined) {
      changed[k] = current[k];
    }
  }
  if (Object.keys(changed).length) {
    return changed;
  }
  return null;
}


function controlsReducer(state, action) {
  let newState = {};
  switch(action.command) {
    case (CMD_SET_INITED):
      startIt();
      action.target.blur();
      return state;
    case (CMD_RESET):
      state = defaultState;
      action.target.blur();
      return state;
    case (CMD_SET_KEY):
      newState = {...state, key: action.key};
      calculateNotesForKey(newState);
      action.target.blur(); // remove focus from widget so typing does not change selection
      return newState;
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
      return {...state, listening: action.listening};
    case (CMD_SET_OCTEQ):
      action.target.blur(); // remove focus from widget so typing does not change selection
      return {...state, octEq: action.octEq};
    case (CMD_SET_OCT_HIGHER):
      action.target.blur();
      return {...state, octHigher: action.octHigher};
    case (CMD_SET_AMP):
      action.target.blur();
      return {...state, amp: action.amp};
    case (CMD_SET_HIDE):
      action.target.blur();
      return {...state, hide: action.hide};
    case (CMD_SET_VELOCITY):
      return {...state, animationVelocity: action.vel};
    case (CMD_SET_TONE):
      action.target.blur();
      return {...state, tone: action.tone};
    case (CMD_SET_RELEASE_WHEN_HEARD):
      action.target.blur();
      return {...state, releaseWhenHeard: action.releaseWhenHeard };
    case (CMD_SET_CHORD_OR_ARPG):
      action.target.blur();
      return {...state, chordOrArpg: action.chordOrArpg };
    case (CMD_SET_LOOPS):
      return {...state, loops: action.loops};
    case (CMD_SET_TONE3):
      action.target.blur();
      return {...state, tone3: action.tone3};
    case (CMD_SET_TONE5):
      action.target.blur();
      return {...state, tone5: action.tone5};
    case (CMD_SET_TONE7):
      action.target.blur();
      return {...state, tone7: action.tone7};
    case (CMD_SET_LOOP_PLAY_TIME):
      return {...state, loopPlayTime: action.loopPlayTime};
    case (CMD_SET_LOOP_PAUSE_TIME):
      return {...state, loopPauseTime: action.loopPauseTime};
    case (CMD_SET_PLAY_CNT_REQ):
      return {...state, heardCntReq: action.heardCntReq };
    case (CMD_SET_INST):
      // todo:
      return state;
  }
  // save to localstore here?
  return state;
}


const Controls = (props) => {
  const [reducerControlledState, dispatch] = useReducer(controlsReducer, initialState);
  
  rcs = reducerControlledState;

  // store values so next window load can reuse
  useEffect(() => {
    const c = findChangesFromDefault(rcs);
    if (Object.keys(c).length) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(c));
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [rcs]);

  return (
    <div>

      <div>
        <select id="selectRoot"
          value={keys.findIndex(k => k.label === keys[rcs.key].label)}
          onChange={e =>
            dispatch({
              command: CMD_SET_KEY,
              key: parseInt(e.currentTarget.value, 10),
              target: e.currentTarget
            })
          }
        >{ renderKeysForKeySelection() }</select>
       <label> key: scale notes</label>
       <span> { renderNotesForKey(keys[rcs.key]) }</span>
      </div>

      <div>
        <select id="selectLow" value={rcs.rangeLow}
          onChange={e =>
            dispatch({
              command: CMD_RANGE_LOW,
              low: parseInt(e.currentTarget.value,10),
              target: e.currentTarget,
            })
          }
        >{ renderNotesForRangeSelection(keys[rcs.key]) }</select>
        <label> lowest note </label>
      </div>

      <div>
        <select id="selectHigh" value={rcs.rangeHigh}
          onChange={e =>
            dispatch({
              command: CMD_RANGE_HIGH,
              high: parseInt(e.currentTarget.value,10),
              target: e.currentTarget
            })
          }
        >
        >{ renderNotesForRangeSelection(keys[rcs.key]) }</select>
        <label> highest note </label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <select id="listening" value={rcs.listening} onChange={e =>
            dispatch({
              command: CMD_SET_INPUT,
              listening: e.currentTarget.value
            })
        }>
          <option value={NONE}>No Listening</option>
          <option value="mic">Microphone</option>
          <option value="cable">Instrument Cable (to USB)</option>
        </select>
        <label> listening mode </label>
      </div>

      <div>
        <input id="heardCntReq" type="range" value={rcs.heardCntReq} disabled={rcs.listening === NONE} min="4" max="100" onChange={e =>
          dispatch({
            command: CMD_SET_PLAY_CNT_REQ,
            heardCntReq: parseInt(e.currentTarget.value,10),
          })
        }/>
        <label htmlFor="heardCntReq">{rcs.heardCntReq} Heard/sensed count required for note to be sensed</label>
      </div>
      <div>
        <input type="checkbox" id="octavesEqual" checked={rcs.octEq} disabled={rcs.listening === NONE}  onChange={e =>
          dispatch({
            command: CMD_SET_OCTEQ,
            octEq: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="octavesEqual">Octave notes are treated as equal when played</label>
      </div>
      <div>
        <input type="checkbox" id="releaseWhenHeard" checked={rcs.releaseWhenHeard} disabled={rcs.listening === NONE} onChange={e =>
          dispatch({
            command: CMD_SET_RELEASE_WHEN_HEARD,
            releaseWhenHeard: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="releaseWhenHeard">Release note at target when heard/sensed count met, otherwise wait until <br></br>after the "loop number" is done playing AND playCountReq IS MET AGAIN</label>
      </div>
      <div>
        <input type="checkbox" id="amp" checked={rcs.amp} checked={rcs.amp}
          disabled={rcs.listening === NONE} onChange={e => dispatch({
            command: CMD_SET_AMP,
            amp: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="amp"> Send input from USB cable to computer audio output</label>
      </div>
      <div>
        <input type="checkbox" id="hide" checked={rcs.hide} onChange={e => dispatch({
            command: CMD_SET_HIDE,
            hide: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="hide"> Hide notes until note is released </label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <input type="checkbox" id="tone" checked={rcs.tone} onChange={e =>
          dispatch({
            command: CMD_SET_TONE,
            tone: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="tone"> Play sound of chord / arpeggio when note reaches the target </label>
      </div>

      <div>
        <span className="horizSpacer"></span>
        <input type="checkbox" id="octHigher" checked={rcs.octHigher} disabled={!rcs.tone} onChange={e =>
          dispatch({
            command: CMD_SET_OCT_HIGHER,
            octHigher: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="octHigher"> Play notes an octave higher </label>
      </div>

      <div>
        <span className="horizSpacer"></span>
        <input type="radio" name="chordOrArpg" id="chord" value="chord" disabled={!rcs.tone} checked={rcs.chordOrArpg === 'chord'} onChange={e =>
          dispatch({
            command: CMD_SET_CHORD_OR_ARPG,
            chordOrArpg: e.currentTarget.value,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="chord">Chord </label>

        <input type="radio" name="chordOrArpg" id="arpg" value="arpg" disabled={!rcs.tone} checked={rcs.chordOrArpg === 'arpg'} onChange={e =>
          dispatch({
            command: CMD_SET_CHORD_OR_ARPG,
            chordOrArpg: e.currentTarget.value,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="arpg">Arpeggio </label>

        <div>
          <span className="horizSpacer"></span>
          <span className="horizSpacer"></span>
          <input type="checkbox" id="tone1" checked={true} disabled={true}/>
          <label htmlFor="tone1">root </label>

          <input type="checkbox" id="tone3" checked={rcs.tone3} disabled={!rcs.tone} onChange={e =>
            dispatch({
              command: CMD_SET_TONE3,
              tone3: e.currentTarget.checked,
              target: e.currentTarget,
            })
          }/>
          <label htmlFor="tone3">third </label>

          <input type="checkbox" id="tone5" checked={rcs.tone5} disabled={!rcs.tone} onChange={e =>
            dispatch({
              command: CMD_SET_TONE5,
              tone5: e.currentTarget.checked,
              target: e.currentTarget,
            })
          }/>
          <label htmlFor="tone5">fifth </label>

          <input type="checkbox" id="tone7" checked={rcs.tone7} disabled={!rcs.tone} onChange={e =>
            dispatch({
              command: CMD_SET_TONE7,
              tone7: e.currentTarget.checked,
              target: e.currentTarget,
            })
          }/>
          <label htmlFor="tone7">seventh </label>
        </div>
      </div>

      <div>
        <span className="horizSpacer"></span>
        <input id="loops" type="range" value={rcs.loops} min="1" max="100" onChange={e =>
          dispatch({
            command: CMD_SET_LOOPS,
            loops: parseInt(e.currentTarget.value,10),
          })
        }/>
        <label htmlFor="loops">{rcs.loops} loops</label>

        <span className="horizSpacer"></span>

        <input id="loopPlayTime" type="range" value={rcs.loopPlayTime} min="100" max="5000"onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PLAY_TIME,
            loopPlayTime: parseInt(e.currentTarget.value,10),
          })
        } step="100"/>
        <label htmlFor="loopPlayTime">{rcs.loopPlayTime} loopPlayTime</label>

        <span className="horizSpacer"></span>

        <input id="loopPauseTime" type="range" value={rcs.loopPauseTime} min="100" max="5000" onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PAUSE_TIME,
            loopPauseTime: parseInt(e.currentTarget.value,10),
          })
        } step="100"/>
        <label htmlFor="loopPauseTime">{rcs.loopPauseTime} loopPauseTime</label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <input id="velocity" type="range" value={rcs.animationVelocity} min="10" max="800"
          onChange={e =>
            dispatch({
              command: CMD_SET_VELOCITY,
              vel: parseInt(e.currentTarget.value,10),
            })} />
        <label>{rcs.animationVelocity} staff note speed </label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <button onClick={e => dispatch({
          command: CMD_SET_INITED,
          target: e.currentTarget
        })}>Start</button>
        <span className="horizSpacer"></span>
        <button onClick={stopIt}>Stop</button>
        <span className="horizSpacer"></span>
        <button onClick={e => dispatch({
          command: CMD_RESET,
          target: e.currentTarget
        })}>Reset</button>
      </div>
    </div>
  );
};

const domContainer = document.querySelector('#reactRoot');
const reactRoot = createRoot(domContainer);
reactRoot.render(<Controls />);

