'use strict';

const { StrictMode } = React
const { createRoot } = ReactDOM;

const CMD_SET_RM_CNR = 'SET_RM_CNR';
const CMD_SET_CNR_RESPOND = 'SET_CNR_RESPOND';
const CMD_RESET = 'RESET';
const CMD_STOP = 'STOP';
const CMD_SET_RM_OLDSTYLE = 'SET_RM_OLDSTYLE';

const CMD_SET_INPUT = 'LISTENING';
const CMD_SET_OCTEQ = 'OCT_EQ';
const CMD_SET_OCT_HIGHER = 'OCT_HIGHER';
const CMD_SET_AMP = 'AMP';
const CMD_SET_HIDE = 'HIDE';
const CMD_SET_KEY = 'KEY';
const CMD_SET_CHORK = 'CHORK';
const CMD_SET_VELOCITY = 'VELOCITY';
const CMD_SET_TONE = 'TONE';
const CMD_SET_TONE3 = 'TONE3';
const CMD_SET_TONE5 = 'TONE5';
const CMD_SET_TONE7 = 'TONE7';
const CMD_SET_CHORD_OR_ARPG = 'CHORD_OR_ARPG';
const CMD_SET_LOOPS = 'LOOPS';
const CMD_SET_LOOP_PLAY_TIME = 'LOOP_PLAY_TIME';
const CMD_SET_LOOP_PAUSE_TIME = 'LOOP_PAUSE_TIME';
const CMD_SET_RANGE_LOW = 'RANGE_LOW';
const CMD_SET_RANGE_HIGH = 'RANGE_HIGH';
const CMD_SET_DETECTED = 'DETECTED';
const CMD_SET_DETECTED_TRIGGER = 'DETECTED_TRIGGER';
const CMD_SET_DETECTED_TRIGGER_THRESHOLD = 'DETECTED_TRIGGER_THRESHOLD';
const CMD_SET_BEEP = 'BEEP';
const CMD_SET_FUNC = 'FUNC';
const CMD_SET_SKIP = 'SKIP';
let rcs = {}; // reducer controlled state
let dispatchRef = null; // handle to dispatcher


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

function isSharpKey(k) {
  return (k < 8 || (k > 14 && k < 23))
}
function sp(s, ss, i) {
  return (s.indexOf(ss) > -1) ? s.split(ss)[i]: s;
}
// input strings are note names from notesActual that are in the range
function noteLabelForRange(str) {
  str = sp(str, '=', 0);
  str = (isSharpKey(rcs.key)) ? sp(str, '/', 1) : sp(str, '/', 0);
  return str;
}

function getLabelForNote(noteString) {
  const i = noteNamesChromaticForKey.indexOf(noteString);
  return getListOfNotesToBeSelected(true)[i];
}

function getListOfNotesToBeSelected(chromatic) {
  const noteNames = (chromatic) ? noteNamesChromaticForKey : noteNamesInKey;
  const k = rcs.key;
  const sharp = isSharpKey(k);
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

function renderNoteRangeForSelector(isLowSelector) {
  const lowest = 2, highest = 34+1; // 2=B0 , 34=G3
  const notesForRangeSelectors = (isLowSelector) ?
    notesActual.slice(lowest, rcs.rangeHigh) :
    notesActual.slice(rcs.rangeLow + 1, highest);
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
  action?.target?.blur(); // remove focus from widget so keyboard does not change selection
  switch(action.command) {
    case (CMD_SET_RM_CNR):
      startAnimation();
      return {...state,
        runMode: RUN_MODE_CNR,
        detectedDisplay: false,
        detectedTrigger: false
      };
    case (CMD_SET_CNR_RESPOND):
      respond();
      return {...state, 
        detectedDisplay: true,
        detectedTrigger: true
      };
    case (CMD_RESET):
      newState = {...defaultState};
      setUpKey(newState);
      renderKeySignature(initialState.key)
      setNoteFunction(newState);
      return newState;
    case (CMD_STOP):
      stopIt();
      return {...state,
        runMode: false,
        detectedDisplay: false,
        detectedTrigger: false
      };
    case (CMD_SET_RM_OLDSTYLE):
      startAnimation();
      return {...state,
        runMode: RUN_MODE_OLDSTYLE,
        detectedDisplay: true,
        detectedTrigger: true
      };
    case (CMD_SET_CHORK):
      newState = {...state,  chromatic: action.chromatic, skip: {}};
      setUpKey(newState);
      renderKeySignature(newState.key)
      clearNotes();
      if (animateRoll.isRunning()) restartAnimation();
      return newState;
    case (CMD_SET_KEY):
      newState = {...state, key: action.key, skip: {}};
      setUpKey(newState);
      renderKeySignature(newState.key)
      clearNotes();
      if (animateRoll.isRunning()) restartAnimation();
      return newState;
    case (CMD_SET_RANGE_LOW):
      newState = {...state, rangeLow: action.low };
      setUpKey(newState);
      return newState;
    case (CMD_SET_RANGE_HIGH):
      newState = {...state, rangeHigh: action.high };
      setUpKey(newState);
      return newState;
    case (CMD_SET_FUNC):
      newState = {...state, func: action.func};
      setNoteFunction(newState);
      return newState;
    case (CMD_SET_INPUT):
      return {...state, input: action.input};
    case (CMD_SET_OCTEQ):
      return {...state, octEq: action.octEq};
    case (CMD_SET_OCT_HIGHER):
      return {...state, octHigher: action.octHigher};
    case (CMD_SET_AMP):
      return {...state, amp: action.amp};
    case (CMD_SET_HIDE):
      return {...state, hide: action.hide};
    case (CMD_SET_VELOCITY):
      return {...state, animationVelocity: action.vel};
    case (CMD_SET_TONE):
      return {...state, tone: action.tone};
    case (CMD_SET_CHORD_OR_ARPG):
      return {...state, chordOrArpg: action.chordOrArpg };
    case (CMD_SET_LOOPS):
      return {...state, loops: action.loops};
    case (CMD_SET_TONE3):
      return {...state, tone3: action.tone3};
    case (CMD_SET_TONE5):
      return {...state, tone5: action.tone5};
    case (CMD_SET_TONE7):
      return {...state, tone7: action.tone7};
    case (CMD_SET_LOOP_PLAY_TIME):
      return {...state, loopPlayTime: action.loopPlayTime};
    case (CMD_SET_LOOP_PAUSE_TIME):
      return {...state, loopPauseTime: action.loopPauseTime};
    case (CMD_SET_DETECTED):
      return {...state, detectedDisplay: action.detectedDisplay };
    case (CMD_SET_DETECTED_TRIGGER):
      return {...state, detectedTrigger: action.detectedTrigger };
    case (CMD_SET_DETECTED_TRIGGER_THRESHOLD):
      return {...state, detectedTriggerThreshold: action.detectedTriggerThreshold };
    case (CMD_SET_BEEP):
      return {...state, beep: action.beep };
    case (CMD_SET_SKIP):
      const {skipNote:skn, skipChecked:skc} = action;
      if (skc === false) {
        delete state.skip[skn];
      } else {
        state.skip = {...state.skip, ...{[action.skipNote]: action.skipChecked}};
      }
      return {...state};
  }
  console.warn('no switch command was found or done and no state was changed');
  return state;
}


let forceReactUpdateTrick = null;
const Controls = (props) => {
  const [reducerControlledState, dispatch] = React.useReducer(controlsReducer, initialState);
  const [, updateReactTrick] = React.useState();

  // use this trick to update React DOM when loopsCtr changes
  // updateReactTrick is the usual setVariable function created by useState();
  // it would change on each rendering of this control,
  // useCallback makes a "memoized" version of that function that does not change
  // for each render so it can be always be called to "set a variable" which causes
  // react to be updated, neat!
  //
  // loopsCtr is a variable that changes via setTimeout so no dispatchRef call
  // can be re-used, using this technique for timer, network, webaudio, konva... variables
  // whose values may show up in the UI but are not changeable by UI widgets
  //
  // if we get lots of variables that change like this and need updates maybe
  // try using React.useSyncExternalStore that stores all the variables that
  // react needs to be updated for
  forceReactUpdateTrick = React.useCallback(() => updateReactTrick({}), []);
  
  // dispatch is essentially the function used to signal that some action has
  // taken place from (ui, network, timer, browser.animationFrame, webAudio ...)
  // and state variables need to change
  //
  // whereas the controlsReducer is used by the react system to actually change
  // the state according to the action that took place, controlsReducer maybe
  // change none, one or many ui state variables
  dispatchRef = dispatch;
  rcs = reducerControlledState;

  // store values so next window load can reuse
  React.useEffect(() => {
    const c = findChangesFromDefault(rcs);
    if (Object.keys(c).length) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(c));
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [reducerControlledState]);

  const noteNamesInKeyOrChromatic = (rcs.chromatic) ? noteNamesChromaticForKey : noteNamesInKey;
  const noteLabelsInKeyOrChromatic = getListOfNotesToBeSelected(rcs.chromatic);

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
        >{ renderNoteRangeForSelector(true) }</select>
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
        >{ renderNoteRangeForSelector(false) }</select>
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
        <select id="input" value={rcs.input} onChange={e =>
            dispatch({
              command: CMD_SET_INPUT,
              input: e.currentTarget.value
            })
        }>
          <option value={NONE}>No input</option>
          <option value="mic">Microphone</option>
          <option value="cable">KATANA GO (USB cable)</option>
        </select>
        <label> input </label>
      </div>

      <div>
        <span>
          <input type="checkbox" id="detectedDisplay" checked={rcs.detectedDisplay} disabled={rcs.input === NONE} onChange={e =>
            dispatch({
              command: CMD_SET_DETECTED,
              detectedDisplay: e.currentTarget.checked,
              target: e.currentTarget,
            })
          }/>
          <label htmlFor="detectedDisplay">display note detected count</label>
        </span>
        <span>
          <input type="checkbox" id="detectedTrigger" checked={rcs.detectedTrigger} disabled={rcs.input === NONE} onChange={e =>
            dispatch({
              command: CMD_SET_DETECTED_TRIGGER,
              detectedTrigger: e.currentTarget.checked,
              target: e.currentTarget,
            })
          }/>
          <input id="detectedTriggerThreshold" type="range" value={rcs.detectedTriggerThreshold} disabled={rcs.input === NONE || rcs.detectedTrigger === false} min="1" max="100" onChange={e =>
            dispatch({
              command: CMD_SET_DETECTED_TRIGGER_THRESHOLD,
              detectedTriggerThreshold: parseInt(e.currentTarget.value,10),
            })
          }/>
          <label htmlFor="detectedTriggerThreshold"> {rcs.detectedTriggerThreshold} note detected release threshold</label>
        </span>
      </div>
      <div>
        <input type="checkbox" id="octavesEqual" checked={rcs.octEq} disabled={rcs.input === NONE} onChange={e =>
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
          disabled={rcs.input === NONE} onChange={e => dispatch({
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
        <label htmlFor="loopPlayTime"> {rcs.loopPlayTime} loop play time</label>

        <span className="horizSpacer"></span>

        <input id="loopPauseTime" type="range" value={rcs.loopPauseTime} min="0" max="8000"
        onChange={e =>
          dispatch({
            command: CMD_SET_LOOP_PAUSE_TIME,
            loopPauseTime: parseInt(e.currentTarget.value,10),
          })
        } step="10"/>
        <label htmlFor="loopPauseTime"> {rcs.loopPauseTime} pause between loops</label>
      </div>

      <div className="vertSpacer"></div>

      <div>
        <input id="velocity" type="range" value={rcs.animationVelocity} min="10" max="125"
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
        <label htmlFor="hide"> Hide notes and detected count until note is released </label>
      </div>

      <div className="vertSpacer"></div>
      <div className="vertSpacer"></div>

      <div>
        <button onClick={e => dispatch({
          command: CMD_SET_RM_OLDSTYLE,
          target: e.currentTarget
        })}>Old Style</button>
      </div>
      <div className="vertSpacer"></div>
      <div>
        <button onClick={e => dispatch({
          command: CMD_SET_RM_CNR,
          target: e.currentTarget
        })}>Call</button>
        <span className="horizSpacer"></span>
        <button onClick={e => dispatch({
          command: CMD_SET_CNR_RESPOND,
          target: e.currentTarget
        })}>Respond</button>
      </div>
      <div className="vertSpacer"></div>
      <div>
        <button onClick={e => dispatch({
          command: CMD_STOP,
          target: e.currentTarget
        })}>Stop</button>
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
