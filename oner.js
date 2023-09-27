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
const CMD_SET_RANGE_LOW = 'RANGE_LOW';
const CMD_SET_RANGE_HIGH = 'RANGE_HIGH';
const CMD_SET_PLAY_CNT_REQ = 'PLAY_CNT_REQ';
const CMD_SET_BEEP = 'BEEP';
const CMD_SET_FUNC = 'FUNC';
const CMD_SET_SKIP = 'SKIP';

const FUNC_RANDO = 'RANDO';
const FUNC_ASC = 'ASC';
const FUNC_DESC = 'DESC';

// keep defaultState to one level of nested objects so the localStorage of ui settings will work
const defaultState = {
  listening: NONE,
  octEq: false,
  octHigher: false,
  amp: false,
  hide: false,
  key: 0, // 0 = C major
  rangeLow: 2,
  rangeHigh: 34,
  animationVelocity: 420,
  tone: true, // play tone when stopped at target
  tone3: false, // play the third
  tone5: false, // play the fifth
  tone7: false, // play the seventh
  chordOrArpg: 'chord', // the selected tones 3,5,7 as a chord or as an arpegio
  loops: 1,
  loopPlayTime: 800,
  loopPauseTime: 0,
  heardCntReq: 23,
  beep: false,
  func: FUNC_RANDO,
  skip: {},
};
const LOCAL_STORAGE_KEY = 'babyGrogu';
const localStoreData = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
const initialState = {...defaultState, ...localStoreData};

let rcs = {}; // reducer controlled state
let notesActualInKeyForRange = [];

calculateNotesForKey(initialState);
setNoteFunction(initialState);




// following works for objects now, not yet for arrays
function findChangesFromDefault(obj) {
  const c = {};
  for (const [k, v] of Object.entries(defaultState)) {
    const rcsV = obj[k]; // rscV is a rcs value
    if (typeof v === 'object') {
      // works for hashs, not yet for arrays
      if (Object.keys(v).length !== Object.keys(rcsV).length) {
        c[k] = {...rcsV};
        break; // no need to find other changes, just swap it
      } else {
        for (const [k2, v2] of Object.entries(v)) {
          const rcsV = rcsV[k2];
          if (rcsV !== undefined && rcsV !== v2) {
            c[k] = {...rcsV};
            break; // no need to find other changes, just swap it
          }
        }
      }
    } else if (rcsV !== undefined && rcsV !== v) {
      c[k] = rcsV;
    }
  }
  return c;
}

function calculateNotesForKey(state) {
  if (state.key < 15) {
    keySteps = KEY_MAJOR_HALF_STEPS;
  } else {
    keySteps = KEY_MINOR_HALF_STEPS;
  }
  // figure out what notes names are in the user specifed key
  noteNamesInKey = [];
  for (let i = notes.indexOf(keys[state.key].root), j = 0;
       j < keySteps.length;
       i = (i + keySteps[j]) % notes.length, j++) {
    const noteInKey = notes[i];
    noteNamesInKey.push(noteInKey);
  }

  // for the key note names, find the notes in range
  notesActualInKeyForRange.length = 0;

  const notesActualLowHighRange = notesActual.slice(state.rangeLow, state.rangeHigh+1); 
  notesActualLowHighRange.forEach(n => {
    if (noteNamesInKey.indexOf(n.n) > -1) {
      notesActualInKeyForRange.push(n);
    }
  });
}

function sp(s, ss, i) {
  return (s.indexOf(ss) > -1) ? s.split(ss)[i]: s;
}
// input strings are note names from notesActual that are in the range
function noteLabelForRange(str) {
  str = sp(str, '=', 0);
  if (rcs.key < 8 || (rcs.key > 14 && rcs.key < 23)) {
    str = sp(str, '/', 1);
  } else {
    str = sp(str, '/', 0);
  }
  return str;
}

function noteLabelForKey(str) {
  const ki = rcs.key;
  if (ki === 0 || // majors
      ki === 1 ||
      ki === 2 ||
      ki === 3 ||
      ki === 4 ||
      ki === 5 ||
      ki === 15 ||  // minors
      ki === 16 ||
      ki === 17 ||
      ki === 18 ||
      ki === 19 ||
      ki === 20
  ) {
    str = sp(str, '=', 0);
    str = sp(str, '/', 1);
  } else if ( // handle enharmonic special cases
      ki === 6 ||    //F#
      ki === 7 ||    //C#
      ki === 21 ||   //D#
      ki === 22      //A#
    ) {
    if (str === notes[11]) {
      str = sp(str, '=', 0); // in key F# note B=C# is called B
    } else {
      str = sp(str, '=', 1); // otherwise use the sharps
    }
    str = sp(str, '/', 1);
  }
  else if (ki === 8 ||
           ki === 9 ||
           ki === 10 ||
           ki === 11 ||
           ki === 12 ||
           ki === 23 ||
           ki === 24 ||
           ki === 25 ||
           ki === 26 ||
           ki === 27
  ) {
    str = sp(str, '=', 0);
    str = sp(str, '/', 0);
  } else if ( // handle enharmonic special cases
           ki === 13 ||   // Gb Major
           ki === 14 ||   // Cb Major
           ki === 28 ||   // Eb Minor
           ki === 29      // Ab Minor
    ) {  
    if (str === notes[11] /*for Gb Major and Eb Minor and Ab Minor*/ ||
        str === notes[4] /*for Cb Major and Ab Minor*/) {
      str = sp(str, '=', 1);
    } else {
      str = sp(str, '=', 0);
    }
    str = sp(str, '/', 0);
  }
  return str;
}

function renderNoteRangeForClef() {
  const notesForRangeSelectors = notesActual.slice(2, 34+1); // 2=B0 , 34=G3
  return notesForRangeSelectors.map(n => {
    return (<option key={n.i} value={n.i}>{noteLabelForRange(n.n) + ' ' + n.l}</option>);
  });
}

function renderKeysForKeySelection(type) {
  return keys.map((k,i) => (
    (k.label.indexOf(type) > 0) && <option key={'ky'+i} value={i} label={k.label.split(' ')[0]} />
  ));
}


function controlsReducer(state, action) {
  let newState = {};
  switch(action.command) {
    case (CMD_SET_INITED):
      startIt();
      action.target.blur();
      return state;
    case (CMD_RESET):
      newState = {...defaultState};
      calculateNotesForKey(newState);
      setNoteFunction(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_KEY):
      newState = {...state, key: action.key, skip: {}};
      calculateNotesForKey(newState);
      action.target.blur(); // remove focus from widget so typing does not change selection
      return newState;
    case (CMD_SET_RANGE_LOW):
      newState = {...state, rangeLow: action.low };
      calculateNotesForKey(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_RANGE_HIGH):
      newState = {...state, rangeHigh: action.high };
      calculateNotesForKey(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_FUNC):
      newState = {...state, func: action.func};
      setNoteFunction(newState);
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
    case (CMD_SET_BEEP):
      return {...state, beep: action.beep };
    case (CMD_SET_SKIP):
      const {skipNote:skn, skipChecked:skc} = action;
      if (state.skip[skn] !== undefined && state.skip[skn] === true && skc === false) {
        delete state.skip[skn];
        state.skip = {...state.skip};
      } else {
        state.skip = {...state.skip, ...{[action.skipNote]: action.skipChecked}};
      }
      action.target.blur();
      return {...state};
  }
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
          >
          <optgroup label="Major Keys">{ renderKeysForKeySelection('Major') }</optgroup>
          <optgroup label="Minor Keys">{ renderKeysForKeySelection('Minor') }</optgroup>
        </select>
        <label> {(rcs.key < 15) ? 'Major' : 'Minor'}</label>
        <span> { 
          noteNamesInKey.map((n,i) => (
            <span key={'sk'+i}>&nbsp;&nbsp;&nbsp;&nbsp;
              <input type="checkbox" id={'skip'+i} value={n} disabled={false/*rcs.func !== FUNC_RANDO*/}
                checked={rcs.skip[n] === undefined} onChange={e => dispatch({
                  command: CMD_SET_SKIP,
                  skipChecked: ! e.currentTarget.checked,
                  skipNote: e.currentTarget.value,
                  target: e.currentTarget
                })} />
              <label htmlFor={'skip'+i}>{noteLabelForKey(n)}</label>
            </span>
          ))
        }</span>
      </div>
      <div className="vertSpacer"></div>

      <div>
        <select id="selectLow" value={rcs.rangeLow}
          onChange={e =>
            dispatch({
              command: CMD_SET_RANGE_LOW,
              low: parseInt(e.currentTarget.value,10),
              target: e.currentTarget,
            })
          }
        >{ renderNoteRangeForClef() }</select>
        <label> lowest note </label>
        <span className="horizSpacer"></span>
        <select id="selectHigh" value={rcs.rangeHigh}
          onChange={e =>
            dispatch({
              command: CMD_SET_RANGE_HIGH,
              high: parseInt(e.currentTarget.value,10),
              target: e.currentTarget
            })
          }
        >{ renderNoteRangeForClef() }</select>
        <label> highest note </label>
      </div>
      <div className="vertSpacer"></div>

      <div>
        <select id="func" value={rcs.func}
          onChange={e =>
            dispatch({
              command: CMD_SET_FUNC,
              func: e.currentTarget.value,
              target: e.currentTarget
            })
          }
        >
          <option key={0} value={FUNC_RANDO}>Random notes</option>
          <option key={1} value={FUNC_ASC}>Ascending notes</option>
          <option key={2} value={FUNC_DESC}>Descending notes</option>
        </select>
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
        <input id="heardCntReq" type="range" value={rcs.heardCntReq} disabled={rcs.listening === NONE} min="1" max="100" onChange={e =>
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
        <input type="checkbox" id="amp" checked={rcs.amp} checked={rcs.amp}
          disabled={rcs.listening === NONE} onChange={e => dispatch({
            command: CMD_SET_AMP,
            amp: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="amp"> Send input from USB cable to computer audio output</label>
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

        <input type="checkbox" id="beep" checked={rcs.beep} onChange={e =>
          dispatch({
            command: CMD_SET_BEEP,
            beep: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="beep"> Beep when note released </label>
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
        <label htmlFor="chord">Harmonic (chord)</label>
        <span className="horizSpacer"></span>

        <input type="radio" name="chordOrArpg" id="arpg" value="arpg" disabled={!rcs.tone} checked={rcs.chordOrArpg === 'arpg'} onChange={e =>
          dispatch({
            command: CMD_SET_CHORD_OR_ARPG,
            chordOrArpg: e.currentTarget.value,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="arpg">Melodic (arpeggio) </label>

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

        <input id="loopPlayTime" type="range" value={rcs.loopPlayTime} min="50" max="2000"onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PLAY_TIME,
            loopPlayTime: parseInt(e.currentTarget.value,10),
          })
        } step="10"/>
        <label htmlFor="loopPlayTime">{rcs.loopPlayTime} loop play time</label>

        <span className="horizSpacer"></span>

        <input id="loopPauseTime" type="range" value={rcs.loopPauseTime} min="0" max="2000"
        onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PAUSE_TIME,
            loopPauseTime: parseInt(e.currentTarget.value,10),
          })
        } step="10"/>
        <label htmlFor="loopPauseTime">{rcs.loopPauseTime} pause between loops</label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <input id="velocity" type="range" value={rcs.animationVelocity} min="10" max="1000"
          onChange={e =>
            dispatch({
              command: CMD_SET_VELOCITY,
              vel: parseInt(e.currentTarget.value,10),
            })} />
        <label htmlFor="velocity">{rcs.animationVelocity} staff note speed </label>
      </div>
      <div>
        <input type="checkbox" id="hide" checked={rcs.hide} onChange={e => dispatch({
            command: CMD_SET_HIDE,
            hide: e.currentTarget.checked,
            target: e.currentTarget,
          })
        }/>
        <label htmlFor="hide"> Hide notes on staff until note is released </label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <button onClick={e => dispatch({
          command: CMD_SET_INITED,
          target: e.currentTarget
        })}>Start</button>
        <span className="horizSpacer"></span>
        <button onClick={e => { e.currentTarget.blur(); stopIt()}}>Stop</button>
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

