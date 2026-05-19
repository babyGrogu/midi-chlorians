'use strict';

const { useReducer, useEffect, useCallback, StrictMode } = React
const { createRoot } = ReactDOM;

const CMD_SET_INITED = 'INITED';
const CMD_RESET = 'RESET';
const CMD_SET_INPUT = 'LISTENING';
const CMD_SET_OCTEQ = 'OCT_EQ';
const CMD_SET_OCT_HIGHER = 'OCT_HIGHER';
const CMD_SET_AMP = 'AMP';
const CMD_SET_HIDE = 'HIDE';
const CMD_SET_KEY = 'KEY';
const CMD_SET_CHORK = 'CHORK';
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

let rcs = {}; // reducer controlled state


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

// i'm smarter than AI
function createNoteLabels(noteNames) {
  const k = rcs.key;
  const sharp = (k < 8 || k > 14 && k < 23);
  const enharmonicCases = (k === 6 || k === 7 || k === 13 || k === 14 || k === 21 || k === 22 ||
                      k === 28 || k === 29); // majors:F#M,C#M,GbM,CbM    minors:D#m,A#m,Ebm,Abm

  return noteNames.map(n => {
    if (n.length === 1) return n; // G D A
    const [l, r] = (n.indexOf('=') > -1) ? n.split('=') : n.split('/');

    // handling the few characters this way is easier than implementing a general
    // Scale Degree Factor SDF algo where each note 'CDEFGAB' would have one note in the scale
    if (enharmonicCases) {
      if ((n === NOTES[5]  && (k === 6 ||  k === 7 ||  k === 21 || k === 22)) ||
          (n === NOTES[0]  && (            k === 7 ||              k === 22)) ||
          (n === NOTES[11] && (k === 13 || k === 14 || k === 28 || k === 29)) ||
          (n === NOTES[4]  && (            k === 14 ||             k === 29))
         ) return r;
    }

    if (sharp) {
      return (l.indexOf('b') > -1) ? r : l;
    } else return l;
  });
}

// not using this implementation of COFI since it didn't work well for chromatic keys
function noteLabelForKeyNew(noteIndexInKeyOrChromatic) {
  const cofiOfKeyIndex = KEYS[rcs.key].cofiOfKey;
  let cofiOffsets = null;
  if (rcs.key < 15) {
    cofiOffsets = (rcs.chromatic ? COFI_MAJOR_CHROMATIC: COFI_MAJOR_DIATONIC);
  } else {
    cofiOffsets = (rcs.chromatic ? COFI_MINOR_CHROMATIC: COFI_MINOR_DIATONIC);
  }
  const offset = cofiOffsets[noteIndexInKeyOrChromatic];
  const cofiValueToLookUp = (cofiOfKeyIndex + offset) % 12;
  const ci = COFI_OF_DEGREE_2NOTES.findIndex(c => c.cofi === cofiValueToLookUp);
  const n = COFI_OF_DEGREE_2NOTES[ci].note;
  const nl = n.length;
  let s = '????'; // string to return
  if (nl === 1) s = n; // G D A
  else if (cofiValueToLookUp > -2 && cofiValueToLookUp < 6) s = n[0]; // first char
  else if (cofiValueToLookUp > 5) s = n[nl-2] + n[nl-1]; // last two chars
  // need to find the flat in either first two chars or last two
  else if (cofiValueToLookUp < -1) s =(n.indexOf('b') === 1) ? n[0]+n[1] : n[nl-2] + n[nl-1];
  // ♮ 9838 NATURAL SIGN
  // ♭ 9837 FLAT SIGN
  // ♯ 9839 SHARP SIGN
  s = s.replace(/#/,String.fromCharCode(9839)); // this looks more like the Konva.Path defined one
  s = s.replace(/b/,String.fromCharCode(9837));
  return s;
}

function renderNoteRangeForClef() {
  const notesForRangeSelectors = notesActual.slice(2, 34+1); // 2=B0 , 34=G3
  return notesForRangeSelectors.map(n => {
    return (<option key={n.i} value={n.i}>{noteLabelForRange(n.n) + ' ' + n.l}</option>);
  });
}

function renderKeysForKeySelection(type) {
  return KEYS.map((k,i) => (
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
    //TODO:
    // - save old key value
    // - set key to C Major and clear key signature
    // do the reverse when unsetting
      newState = {...defaultState};
      setUpKey(newState);
      renderKeySignature(initialState.key)
      setNoteFunction(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_CHORK):
      newState = {...state,  chromatic: action.chromatic, skip: {}};
      setUpKey(newState);
      renderKeySignature(newState.key)
      action.target.blur();
      return newState;
    case (CMD_SET_KEY):
      newState = {...state, key: action.key, skip: {}};
      setUpKey(newState);
      renderKeySignature(newState.key)
      action.target.blur(); // remove focus from widget so typing does not change selection
      return newState;
    case (CMD_SET_RANGE_LOW):
      newState = {...state, rangeLow: action.low };
      setUpKey(newState);
      action.target.blur();
      return newState;
    case (CMD_SET_RANGE_HIGH):
      newState = {...state, rangeHigh: action.high };
      setUpKey(newState);
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
      action.target.blur();
      return {...state, beep: action.beep };
    case (CMD_SET_SKIP):
      const {skipNote:skn, skipChecked:skc} = action;
      if (skc === false) {
        delete state.skip[skn];
      } else {
        state.skip = {...state.skip, ...{[action.skipNote]: action.skipChecked}};
      }
      action.target.blur();
      return {...state};
  }
  return state;
}


let forceReactUpdateTrick = null;
const Controls = (props) => {
  const [reducerControlledState, dispatch] = useReducer(controlsReducer, initialState);
  const [, updateReactTrick] = React.useState();
  // use this trick to update react each when loopsCtr changes
  // if we get lots of variables that change like this and need updates maybe
  // try using React.useSyncExternalStore that stores all the variables that
  // react needs to be updated for
  forceReactUpdateTrick = React.useCallback(() => updateReactTrick({}), []);
  
  rcs = reducerControlledState;
  const noteNamesInKeyOrChromatic = (rcs.chromatic) ? noteNamesChromaticForKey : noteNamesInKey;

  // build up array of noteLabels using the above
  //  - noteNamesInKeyOrChromatic 
  //  - rcs.key knowledge of if it is a list of sharp or flats 
  const noteLabelsInKeyOrChromatic = createNoteLabels(noteNamesInKeyOrChromatic);

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
        <label>Key </label>
        <select id="selectKey"
          value={KEYS.findIndex(k => k.label === KEYS[rcs.key].label)}
          onChange={e =>
            dispatch({
              command: CMD_SET_KEY,
              key: parseInt(e.currentTarget.value, 10),
              target: e.currentTarget
            })
          }
          >
          <optgroup label=" Major Keys">{ renderKeysForKeySelection('Major') }</optgroup>
          <optgroup label=" Minor Keys">{ renderKeysForKeySelection('Minor') }</optgroup>
        </select>
        <label> {(rcs.key < 15) ? ' Major' : ' Minor'}</label>
        <span> { 
          noteNamesInKeyOrChromatic.map((n,i) => (
            <span key={'sk'+i}>&nbsp;&nbsp;&nbsp;&nbsp;
              <input type="checkbox" id={'skip'+i} value={n}
                checked={rcs.skip[n] === undefined} onChange={e => dispatch({
                  command: CMD_SET_SKIP,
                  skipChecked: ! e.currentTarget.checked,
                  skipNote: e.currentTarget.value,
                  target: e.currentTarget
                })} />
              <label htmlFor={'skip'+i}
              style={
                (noteNamesInKey.indexOf(n) === -1) ? {fontSize: 'x-small'} : {fontSize: 'x-large'}
              }
              >{ noteLabelsInKeyOrChromatic[i] }</label>
            </span>
          ))
        }</span>
        <span className="horizSpacer"></span>
        <select id="selectChOrKey"
          value={rcs.chromatic}
          onChange={e =>
            dispatch({
              command: CMD_SET_CHORK,
              chromatic: parseInt(e.currentTarget.value, 10),
              target: e.currentTarget
            })
          }
          >
          <option value={0}>Show only notes in the key</option>
          <option value={1}>Show all notes{/* chromatic */}</option>
        </select>
      </div>
      <div className="vertSpacer"></div>
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
        <label htmlFor="loops"> {rcs.loops > 1 && loopsCtr > 0 ? loopsCtr + '/' : ''}{rcs.loops} loops </label>

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
        <span className="horizSpacer"></span>
        <button onClick={e => {
          e.currentTarget.blur();
          clearNotes();
        }}>Clear notes</button>
      </div>
    </div>
  );
};

const domContainer = document.querySelector('#reactRoot');
let reactRoot;
if (!reactRoot) {
  reactRoot = createRoot(domContainer);
}
reactRoot.render(<StrictMode><Controls /></StrictMode>);
