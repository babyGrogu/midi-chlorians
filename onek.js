
// first need to create a stage
let margin = 30;
let width = window.innerWidth-(2*margin);
//let height = window.innerHeight;
let height = 220;
let stage, layer;

// create our staff
const lines = [];
const linesAboveStaff = 3; // line for C, E, G
const lineSpacing = 16;
const linesInStaff = 5;
const topLine = 20;

const noteWidth = 48;
const noteSpacing = 32;
const noteTotalWidth = noteSpacing + noteWidth;
const noteRadiusX = 6;
const noteRadiusY = 8;
const noteStrokeWidth = 3;
const lineStrokeWidth = 2;
const lineStrokeColor = 'black';
const noteColor = 'black';
const staffColor = 'green';
const staffLineSegmentLength = noteRadiusY*2;
const noteStemSpacing = 3; // in units of the lineSpacing variable
const targetPercent = 33;
const numOfNotes = 12;

// the x values at which notes are created and destroyed
const noteCreateX = width * .9;
const noteDestroyX = width * .1;

const NOTE = 'NOTE';
const NOTE_PLAYED = 'NOTE_PLAYED';
const TYPE = 'TYPE';
const TYPE_NOTE = 'TYPE_NOTE';


let quarterNote, quarterNoteFlipped, quarterNoteFlippedG, quarterNoteFlippedF,quarterNoteFlippedE, quarterNoteFlippedD, quarterNoteFlippedC, quarterNoteE, quarterNoteD, quarterNoteC, quarterNoteB, tooltip, animateNoteFunction;
let roll, measure, hiddenTic, sharp, flat, natural, keySig = [], beatCtr = 0, targetX, targetZoneWidth, lastNoteGenerated = {n:-1}; 

// create staff
function initKonva() {
  stage = new Konva.Stage({
    container: 'konvaRoot',  // html <div> id
    width,
    height,
  });

  // then create layer
  layer = new Konva.Layer();

  // render static staff lines
  for (let i=linesAboveStaff; i < (linesAboveStaff+linesInStaff); i++) {
    const lineY = topLine + i * lineSpacing;
    const line = new Konva.Line({
      points: [ 0, lineY, width, lineY ], 
      stroke: lineStrokeColor,
      //strokeWidth: lineStrokeWidth, 
      strokeWidth: 1, 
    });
    lines.push(line);
  }

  for (let line of lines) {
    layer.add(line);
  };

  targetX = width * targetPercent/100;
  targetZoneWidth = width * .02;
  const targetColor = 'green';
  const targetHeight = lineSpacing * 10 + 2 * noteRadiusY;
  const target = new Konva.Line({
    points: [targetX, topLine - 2 * noteRadiusY,
             targetX, topLine - 2 * noteRadiusY + targetHeight],
    stroke: targetColor,
    strokeWidth: 3, 
  });
  layer.add(target);

  const targetZone = new Konva.Rect({
    x: targetX - targetZoneWidth/2,
    y: topLine - 2 * noteRadiusY,
    width: targetZoneWidth,
    height: targetHeight,
    fill: targetColor,
    opacity: .2,
  });
  layer.add(targetZone);

  roll = new Konva.Group({
    x: 0,
    y: topLine,
  });
  layer.add(roll);

  createAndCacheElements();

  drawBassClef();
  //layer.add(natural.clone({x:23,y:4}));

  tooltip = new Konva.Text({
        text: '',
        fontFamily: 'Calibri',
        fontSize: 20,
        padding: 5,
        textFill: 'white',
        fill: 'black',
        alpha: 0.75,
        visible: false,
      });
  const tooltipLayer = new Konva.Layer();
  tooltipLayer.add(tooltip);
  stage.add(tooltipLayer);

  // add the layer to the stage
  stage.add(layer);

  // draw the image
  layer.draw();
}

function createAndCacheElements() {

  // ellipse's ORIGIN/offset/center is the middle of the ellipse
  const quarterNoteHead = new Konva.Ellipse({
    radiusX: noteRadiusX,
    radiusY: noteRadiusY,
    fill: 'black', // set fill to 'white' for half notes
    stroke: noteColor,
    strokeWidth: noteStrokeWidth,
    // todo: maybe use a fill pattern to get shaped left and right sides
    rotation: 70,
  });
  quarterNoteHead.cache();

  const quarterNoteStem = new Konva.Line({
    // todo: algorithm to use rotation angle and radiusY to figure x
    points: [noteRadiusY+1, -lineSpacing*noteStemSpacing,
             noteRadiusY+1, 0],
    stroke: noteColor,
  });
  quarterNoteStem.cache();

  quarterNote = new Konva.Group({});
  quarterNote.add(quarterNoteHead);
  quarterNote.add(quarterNoteStem);
  quarterNote.cache();

  quarterNoteFlipped = new Konva.Group({});
  const quarterNoteHeadFlipped = quarterNoteHead.clone({});
  // need a clone here since we can not add the quarterNoteHead to two groups
  quarterNoteHeadFlipped.cache(); 
  const quarterNoteStemFlipped = quarterNoteStem.clone({
    points: [-noteRadiusY-1, 0,
             -noteRadiusY-1, lineSpacing*noteStemSpacing],
  });
  quarterNoteStemFlipped.cache(); 
  quarterNoteFlipped.add(quarterNoteHeadFlipped);
  quarterNoteFlipped.add(quarterNoteStemFlipped);
  quarterNoteFlipped.cache();

  const staffLineSegment = new Konva.Line({
    points: [-staffLineSegmentLength, 0,
              staffLineSegmentLength, 0],
    stroke: lineStrokeColor,
    strokeWidth: lineStrokeWidth, 
  });
  staffLineSegment.cache();


  // ---------------- ABOVE BASS CLEF STAFF ---------------------
  // for G add line through the note and stem
  quarterNoteFlippedG = new Konva.Group({});
  const quarterNoteHeadFlippedG = quarterNoteHead.clone({});
  const quarterNoteStemFlippedG = quarterNoteStemFlipped.clone({});
  quarterNoteFlippedG.add(quarterNoteHeadFlippedG);
  quarterNoteFlippedG.add(quarterNoteStemFlippedG);
  quarterNoteFlippedG.add(staffLineSegment.clone({}));
  quarterNoteFlippedG.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing,
              staffLineSegmentLength, lineSpacing],
  }));
  quarterNoteFlippedG.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing*2,
              staffLineSegmentLength, lineSpacing*2],
  }));
  quarterNoteFlippedG.cache();

  // for F add line through the note and stem
  quarterNoteFlippedF = new Konva.Group({});
  const quarterNoteHeadFlippedF = quarterNoteHead.clone({});
  const quarterNoteStemFlippedF = quarterNoteStemFlipped.clone({});
  quarterNoteFlippedF.add(quarterNoteHeadFlippedF);
  quarterNoteFlippedF.add(quarterNoteStemFlippedF);
  quarterNoteFlippedF.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing/2,
              staffLineSegmentLength, lineSpacing/2],
  }));
  quarterNoteFlippedF.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing*1.5,
              staffLineSegmentLength, lineSpacing*1.5],
  }));
  quarterNoteFlippedF.cache();

  // for E add line through the note and stem
  quarterNoteFlippedE = new Konva.Group({});
  const quarterNoteHeadFlippedE = quarterNoteHead.clone({});
  const quarterNoteStemFlippedE = quarterNoteStemFlipped.clone({});
  quarterNoteFlippedE.add(quarterNoteHeadFlippedE);
  quarterNoteFlippedE.add(quarterNoteStemFlippedE);
  quarterNoteFlippedE.add(staffLineSegment.clone({}));
  quarterNoteFlippedE.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing,
              staffLineSegmentLength, lineSpacing],
  }));
  quarterNoteFlippedE.cache();

  // for D add line through the note
  quarterNoteFlippedD = new Konva.Group({});
  const quarterNoteHeadFlippedD = quarterNoteHead.clone({});
  const quarterNoteStemFlippedD = quarterNoteStemFlipped.clone({});
  quarterNoteFlippedD.add(quarterNoteHeadFlippedD);
  quarterNoteFlippedD.add(quarterNoteStemFlippedD);
  quarterNoteFlippedD.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, lineSpacing/2,
              staffLineSegmentLength, lineSpacing/2],
  }));
  quarterNoteFlippedD.cache();

  // for C add line through the note
  quarterNoteFlippedC = new Konva.Group({});
  const quarterNoteHeadFlippedC = quarterNoteHead.clone({});
  const quarterNoteStemFlippedC = quarterNoteStemFlipped.clone({});
  quarterNoteFlippedC.add(quarterNoteHeadFlippedC);
  quarterNoteFlippedC.add(quarterNoteStemFlippedC);
  quarterNoteFlippedC.add(staffLineSegment.clone({}));
  quarterNoteFlippedC.cache();

  // ---------------- BELOW BASS CLEF STAFF ---------------------
  // for E add line through the note
  quarterNoteE = new Konva.Group({});
  const quarterNoteHeadE = quarterNoteHead.clone({});
  const quarterNoteStemE = quarterNoteStem.clone({});
  quarterNoteE.add(quarterNoteHeadE);
  quarterNoteE.add(quarterNoteStemE);
  quarterNoteE.add(staffLineSegment.clone({}));
  quarterNoteE.cache();

  // for D add line through the note
  quarterNoteD = new Konva.Group({});
  const quarterNoteHeadD = quarterNoteHead.clone({});
  const quarterNoteStemD = quarterNoteStem.clone({});
  quarterNoteD.add(quarterNoteHeadD);
  quarterNoteD.add(quarterNoteStemD);
  quarterNoteD.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, -lineSpacing/2,
              staffLineSegmentLength, -lineSpacing/2],
  }));
  quarterNoteD.cache();

  // for C add line through the note
  quarterNoteC = new Konva.Group({});
  const quarterNoteHeadC = quarterNoteHead.clone({});
  const quarterNoteStemC = quarterNoteStem.clone({});
  quarterNoteC.add(quarterNoteHeadC);
  quarterNoteC.add(quarterNoteStemC);
  quarterNoteC.add(staffLineSegment.clone({}));
  quarterNoteC.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, -lineSpacing,
              staffLineSegmentLength, -lineSpacing],
  }));
  quarterNoteC.add(staffLineSegment.clone({}));
  quarterNoteC.cache();

  // for B add line through the note
  quarterNoteB = new Konva.Group({});
  const quarterNoteHeadB = quarterNoteHead.clone({});
  const quarterNoteStemB = quarterNoteStem.clone({});
  quarterNoteB.add(quarterNoteHeadB);
  quarterNoteB.add(quarterNoteStemB);
  quarterNoteB.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, -lineSpacing*1.5,
              staffLineSegmentLength, -lineSpacing*1.5],
  }));
  quarterNoteB.add(staffLineSegment.clone({
    points: [-staffLineSegmentLength, -lineSpacing/2,
              staffLineSegmentLength, -lineSpacing/2],
  }));
  quarterNoteB.cache();

  // a "measure" (or "bar") is used to separate every fourth quarter note
  measure = new Konva.Group({});
  measureLine = new Konva.Line({
    points: [0, lineSpacing*3,
             0, lineSpacing*7],
    stroke: lineStrokeColor,
    strokeWidth: 2, 
  });
  measure.add(measureLine);
  measure.cache();

  // used when notes are hidden
  hiddenTic = new Konva.Group({});
  hiddenTicLine = new Konva.Line({
    points: [0, lineSpacing*5-4,
             0, lineSpacing*5+4],
    stroke: lineStrokeColor,
    strokeWidth: 2, 
  });
  hiddenTic.add(hiddenTicLine);
  hiddenTic.cache();

  
  sharp = new Konva.Path({
    fill: 'black',
    scaleX: 0.50,
    scaleY: 0.50,
    data: 'm 79.903152,145.91202 0,-17.00357 7.046381,-1.99531 0,16.91681 -7.046381,2.08207 z m 13.874322,-4.11353 -4.844386,1.42418 0,-16.91681 4.844386,-1.38804 0,-7.02698 -4.844386,1.38804 0,-17.28468 -1.983555,0 0,17.80881 -7.046381,2.07845 0,-16.80753 -1.870814,0 0,17.44734 -4.844386,1.39166 0,7.04144 4.844386,-1.38805 0,16.88428 -4.844386,1.38444 0,7.01252 4.844386,-1.38804 0,17.18708 1.870814,0 0,-17.80159 7.046381,-1.98808 0,16.72079 1.983555,0 0,-17.34975 4.844386,-1.39166 0,-7.03782 z',
  });
  sharp.cache();

  flat = new Konva.Path({
    fill: 'black',
    scaleX: 0.50,
    scaleY: 0.50,
    data: 'm 76.082718,89.459865 0,30.818095 c -2e-6,1e-5 -2e-6,2.07737 0,6.23206 2.760333,-2.6616 5.858041,-4.02486 9.293135,-4.0898 2.146916,3e-5 3.987139,0.94133 5.520675,2.8239 1.349483,1.75278 2.054897,3.7003 2.116256,5.84256 0.0613,1.68785 -0.337388,3.63536 -1.196145,5.84255 -0.306719,0.90884 -0.981468,1.8826 -2.024245,2.92127 -0.797446,0.77901 -1.625547,1.59047 -2.484304,2.4344 -4.539231,3.50552 -9.078447,7.0435 -13.617664,10.61396 l 0,-63.438995 2.392292,0 m 7.452911,39.192415 c -0.736099,-0.90883 -1.686881,-1.36325 -2.852349,-1.36325 -1.472185,0 -2.66833,0.87638 -3.588438,2.62914 -0.674752,1.36326 -1.012126,4.57666 -1.012124,9.64021 l 0,8.37432 c 0.06134,0.25965 1.77888,-1.33081 5.152629,-4.77142 1.840216,-1.81768 3.036361,-3.95996 3.588439,-6.4268 0.245352,-0.97377 0.368034,-1.94751 0.368045,-2.92128 -1.1e-5,-2.14227 -0.552078,-3.86257 -1.656202,-5.16092',
  });
  flat.cache();

  natural = new Konva.Path({
    fill: 'black',
    scaleX: 0.50,
    scaleY: 0.50,
    data: 'M 0,8.880 V 36.288 h -1.248 V 26.016 l -6.672,1.728 V 0 h 1.2 v 10.704 l 6.72,-1.824 z m -6.72,6.432 v 7.536 l 5.472,-1.44 v -7.536 l -5.472,1.44 z',
  });
  natural.cache();
}

// note relates to values in noteMapActuals
function renderNote(note) {
  // get noteIndex to staff line mapping given the instrument, and key
  let noteK;
  let staffLine = getStaffLine(note, rcs.key);
  switch(true) {
    case (staffLine === 0):
      noteK = quarterNoteFlippedG;
      break;
    case (staffLine === 1):
      noteK = quarterNoteFlippedF;
      break;
    case (staffLine === 2):
      noteK = quarterNoteFlippedE;
      break;
    case (staffLine === 3):
      noteK = quarterNoteFlippedD;
      break;
    case (staffLine === 4):
      noteK = quarterNoteFlippedC;
      break;
    case (staffLine < 10):
      noteK = quarterNoteFlipped;
      break;
    default:
      noteK = quarterNote;
      break;
    case (staffLine === 16):
      noteK = quarterNoteE;
      break;
    case (staffLine === 17):
      noteK = quarterNoteD;
      break;
    case (staffLine === 18):
      noteK = quarterNoteC;
      break;
    case (staffLine === 19):
      noteK = quarterNoteB;
      break;
  }

  const noteInsertionPoint = noteCreateX + noteTotalWidth * beatCtr;
  const measureInsertionPoint = noteInsertionPoint - noteTotalWidth/2;
  if ((beatCtr % 4) === 0) {
    const m = measure.clone({
      x: measureInsertionPoint,
    });
    roll.add(m);
  }

  if (rcs.hide) {
    const h = hiddenTic.clone({
      x: noteInsertionPoint,
    });
    roll.add(h);
  }

  const newNoteK = noteK.clone({
    x: noteInsertionPoint,
    y: lineSpacing * staffLine/2
  });
  newNoteK.on('mousemove', function (evt) {
    const mousePos = stage.getPointerPosition();
    tooltip.position({
      x: mousePos.x + 5,
      y: mousePos.y + 5,
    });
    tooltip.text(noteLabelForKey(evt.currentTarget.getAttr(NOTE).n, keys[rcs.key]));
    tooltip.show();
  });
  newNoteK.on('mouseout', function () {
    tooltip.hide();
  });

  newNoteK.setAttr(NOTE, note);
  newNoteK.setAttr(NOTE_PLAYED, false);
  newNoteK.setAttr(TYPE, TYPE_NOTE);
  if (rcs.hide) {
    newNoteK.setAttr('visible', false);
  }
  roll.add(newNoteK);

  beatCtr++;
  layer.draw();
}

function findFirstUnplayedKonvaNote() {
  const c = roll.getChildren();
  if (c && c.length) {
    for (let i=0; i<c.length; i++) {
      const child = c[i];
      if (child.getAttr(TYPE) === TYPE_NOTE) {
        const played = child.getAttr(NOTE_PLAYED);
        if (played === false) {
          return child;
        }
      }
    }
  }
  return null;
}

function findFirstUnplayedNote() {
  const kn = findFirstUnplayedKonvaNote();
  return (kn) ? kn.getAttr(NOTE) : null;
}

function findLeftMostNoteToPlay() {
  const g = findLeftMostGroupToPlay();
  if (g) {
    return g.getAttr(NOTE);
  }
  return null;
}

function releaseNoteAtTarget() {
  startTimerOrPauseTimerIsRunning = false;
  heardCnt = 0;
  const konvaNote = findFirstUnplayedKonvaNote();
  if (konvaNote) {
    stopPad(konvaNote.getAttr(NOTE).f);
    konvaNote.setAttr(NOTE_PLAYED, true);
    // always make note visible in case user toggles 'hide' back and forth
    konvaNote.setAttr('visible', true);
  }
  if (! animateRoll.isRunning()) {
    animateRoll.start();
  }
  stopPadAll();
  if (rcs.tone && rcs.beep) {
    beep();
  }
}

function showNoteAtTarget() {
  const konvaNote = findFirstUnplayedKonvaNote();
  if (konvaNote) {
    konvaNote.setAttr('visible', true);
  }
}

function destroyAllNotes() {
  const c = roll.getChildren();
  for (let i=0; i < c.length; i++) {
    c[i];
  }
}

function destroyLeftMostNote() {
  const c = roll.getChildren();
  if (c && c.length) {
    // either have Type of Group (note) or Shape (measure-line) 
    if (c[0].getType() === 'Shape') {
      // get them both and destroy in case konva has timing issues
      const c0 = c[0];
      const c1 = c[1];
      c0.destroy();
      c1.destroy();
    } else {
      c[0].destroy();
    }
  }
}

function filterUserChosenNotes(a) {
  // remove notes the user unchecks from the key
  if (Object.keys(rcs.skip).length) {
    a = a.filter(n => rcs.skip[n.n] === undefined);
  }
  return a;
}

function generateRandomNote() {
  // available notes from key
  let available = [...notesActualInKeyForRange];
  available = filterUserChosenNotes(available);

  // remove the last note to keep it interesting
  if (lastNoteGenerated.n !== -1) {
    const ind = available.findIndex(n => n.i === lastNoteGenerated.i);
    available.splice(ind, 1);
  }

  // pick a note
  const rand = Math.floor(Math.random()*(available.length));
  lastNoteGenerated = available[rand];
  return lastNoteGenerated;
}

function generateAscendingKeyNote() {
  // available notes from key
  let available = [...notesActualInKeyForRange];
  available = filterUserChosenNotes(available);
  // start at first note if no previous notes
  if (lastNoteGenerated.n === -1) {
    lastNoteGenerated = available[0];
    return lastNoteGenerated;
  }
  // if the last note was the highest then restart at lowest
  // else go to next note higher
  let idx = available.findIndex(n => n.i === lastNoteGenerated.i);
  if (idx === available.length-1) {
    idx = 0;
  } else {
    idx++;
  }
  lastNoteGenerated = available[idx];
  return lastNoteGenerated;
}

function generateDescendingKeyNote() {
  // available notes from key
  let available = [...notesActualInKeyForRange];
  available = filterUserChosenNotes(available);
  // start at last note if no previous notes
  if (lastNoteGenerated.n === -1) {
    lastNoteGenerated = available[available.length-1];
    return lastNoteGenerated;
  }

  // if the last note was the lowest then restart at highest
  // else go to next lower higher
  let idx = available.findIndex(n => n.i === lastNoteGenerated.i);
  if (idx === 0) {
    idx = available.length-1;
  } else {
    idx--;
  }
  lastNoteGenerated = available[idx];
  return lastNoteGenerated;
}

function clearNotes() {
  const c = roll.getChildren();
  if (c && c.length) {
    let restart = animateRoll.isRunning() || startTimerOrPauseTimerIsRunning;
    stopIt();
    for (let i=c.length-1; i>-1; i--) {
      c[i].destroy();
    }
    if (restart) startIt();
  }
}

function testRenderAscendingNotes() {
  animateNoteFunction = generateAscendingKeyNote;
}

function testRenderLowestKeyNotes() {
  destroyAllNotes();
  const firstNoteOfKeyIndex = notesActualInKeyForRange.findIndex(n => n.n === rcs.key.root);
  const testNotes = notesActualInKeyForRange.slice(firstNoteOfKeyIndex,firstNoteOfKeyIndex+8);
  testNotes.forEach(n => {
    renderNote(n);
  });
}

function renderKeySignature(key) {
  keySig.forEach(acc => {
    acc.destroy();
  });
  keySig.length = 0;
  keys[key].acc.forEach((accidental, ind) => {
    const accType = (key < 8 || (key > 15 && key < 23)) ? sharp : flat;
    const staffLine = getStaffLine(accidental , key);
    const acc = accType.clone({
      x: ind * 10 + 23,
      y: lineSpacing * staffLine/2 - 48
    });
    layer.add(acc);
    keySig.push(acc);
  });
  layer.draw();
}

const nlm = {}; // noteLineMap for bass clef
let octaveLevel = 3;
const staffLines = 'GFEDCBA'.split(''); // starting at top G, 3rd line above staff
for (let i=0,j=0; i<20; i++,j=(j+1)%7) {
  const staffLine = staffLines[j];
  let h = staffLine + '#' + octaveLevel;
  nlm[h] = i;

  // line order here is important to change the level at B#
  if (staffLine + '#' === 'B#') octaveLevel--;  // good for sharps

  h = staffLine + octaveLevel;
  nlm[h] = i;

  h = staffLine + 'b' + octaveLevel;
  nlm[h] = i;
}

function getStaffLine(note, k) {
  let key = keys[k];
  // handle special corner cases first
  if (
    // E=Fb is called Fb, in key Cb Major or Ab Minor
    (note.n === notes[4] && (key.i === 14 || key.i === 29)) ||
    // F=E# is called E# in key F#, C# Major or D#, A# Minor
    (note.n === notes[5] && (key.i === 6 || key.i === 7 || key.i === 21 || key.i === 22)) ||
    // C=B# is called B# in key C# Major or A# Minor
    (note.n === notes[0] && (key.i === 7 || key.i === 22))
  ) {
    return nlm[note.n.slice(2,4) + note.l]; 
  } else if (
    // B=Cb is called Cb (and so crosses the nlm level) in keys Gb, Cb Major or Eb Minor, 
    note.n === notes[11] && (key.i === 13 || key.i === 14 || key.i === 28 || key.i === 29)
  ) {
    return nlm[note.n.slice(2,4) + (note.l+1)]; 
  } else if (
    note.n === notes[11] || // B=Cb
    note.n === notes[4]  || // E=Fb
    note.n === notes[9]  || // A
    note.n === notes[2]  || // D
    note.n === notes[7]  || // G
    note.n === notes[0]  || // C=B#
    note.n === notes[5]     // F=E#
  ) {
    return nlm[note.n.slice(0,1) + note.l]; 
  } else if (
    note.n === notes[10] || // Bb/A#
    note.n === notes[3]  || // Eb/D#
    note.n === notes[8]  || // Ab/G#
    note.n === notes[1]  || // Db/C#
    note.n === notes[6]     // Gb/F#
  ) {
    if (key.i < 8 || key.i > 15 && key.i < 23) {
      // use sharp name
      return nlm[note.n.slice(3,5) + note.l];
    } else {
      // use flat name
      return nlm[note.n.slice(0,2) + note.l]; 
    }
  }
  return 0;
}

const animateRoll = new Konva.Animation(function (frame) {

  // frame.timeDiff is never very big even after a stop and start
  const newX = roll.getAttr('x') - frame.timeDiff/1000 * rcs.animationVelocity;
  roll.x(newX);


  // destroy notes on left and create notes on right
  const c = roll.getChildren();
  if (c && c.length) {
    let child, childX;
    for (let i=0; i<c.length; i++) {
      child = c[i];
      childX = newX + child.getAttr('x')
      //console.log(childX + ' ' + noteDestroyX);
      if (childX > 0 && childX <= noteDestroyX) {
        child.destroy();
      }
    }

  }

  // depending on where last note rendered was maybe create another one
  if (c && c.length) {
    child = c[c.length-1];
    childX = newX + child.getAttr('x')
    if (childX > 0 && childX <= noteCreateX - noteTotalWidth) {
      const n = animateNoteFunction();
      renderNote(n);
    }
  } else {
    const n = animateNoteFunction();
    renderNote(n);
  }


  // as each notes passes the target stop the animation and optionally play tone
  const konvaNote = findFirstUnplayedKonvaNote();
  if (konvaNote) {
    const konvaNoteX = konvaNote.getAttr('x') + newX  + noteRadiusX + 4;
    const targetLineX = targetX + targetZoneWidth/2;
    //console.log(' knx ' + konvaNoteX + '    ' + ' tlx ' + targetLineX);
    if (konvaNoteX <= targetLineX) {
      animateRoll.stop();
      if (rcs.tone) {
        loopsStart(konvaNote.getAttr(NOTE));
      }
    }
  }

}, layer);

function drawBassClef() {
  const apathy = new Konva.Path({
    x: 0,
    y: 23,
    fill: 'black',
    scaleX: 0.13,
    scaleY: 0.13,
    // bass clef
    data: 'M 43.9277 729.002 C 76.685 706.884 101.149 690.139 116.906 678.563 C 132.663 667.194 149.249 652.93 166.249 635.979 C 183.25 619.029 197.555 599.804 209.166 578.512 C 218.288 562.801 226.166 544.61 232.593 523.938 C 239.02 503.473 242.338 483.629 242.96 464.817 C 242.96 447.246 240.679 430.502 235.91 414.792 C 231.349 398.874 223.471 385.851 212.275 375.309 C 201.08 364.973 186.567 359.805 168.53 359.805 C 151.115 359.805 134.736 363.319 119.394 370.141 C 104.259 377.169 93.4783 388.332 87.4659 404.042 C 87.4659 405.489 86.6366 407.35 85.3927 410.037 C 85.8073 413.345 87.4659 415.825 90.5758 417.686 C 93.6857 419.546 96.3809 420.373 98.8688 420.373 C 100.113 420.373 103.637 419.753 109.028 418.513 C 114.625 417.272 119.187 416.445 122.918 416.445 C 133.907 416.445 143.651 420.373 152.566 428.022 C 161.274 435.67 165.627 444.972 165.627 455.928 C 165.627 463.784 163.347 471.226 158.993 478.047 C 154.639 484.869 148.627 490.45 140.956 494.378 C 133.285 498.512 124.784 500.373 115.662 500.373 C 99.0761 500.373 84.978 495.411 73.3678 485.282 C 61.9649 474.946 56.1598 461.923 56.1598 445.593 C 56.1598 424.714 62.5869 406.73 75.2337 391.433 C 88.0879 376.135 104.259 364.766 124.162 357.117 C 143.858 349.262 163.761 345.541 184.079 345.541 C 206.263 345.541 227.41 351.123 247.106 362.492 C 267.009 373.655 282.559 389.159 294.169 408.383 C 305.779 427.815 311.791 448.487 311.791 470.812 C 311.791 510.502 298.523 547.298 271.985 581.406 C 245.447 615.514 212.69 645.075 173.506 670.294 C 147.383 687.452 105.089 710.604 46.8302 739.752 L 43.9277 729.002 Z M 331.902 409.21 C 331.902 401.768 334.597 395.567 339.988 390.606 C 345.171 385.438 351.598 382.957 359.269 382.957 C 365.903 382.957 372.123 385.851 377.721 391.433 C 383.318 396.807 386.014 403.215 386.014 410.244 C 386.014 417.686 383.111 424.094 377.721 429.262 C 371.916 434.223 365.488 436.704 358.232 436.704 C 350.561 436.704 344.341 434.223 339.366 428.642 C 334.39 423.267 331.902 416.859 331.902 409.21 Z M 331.902 517.53 C 331.902 510.088 334.597 503.68 339.573 498.719 C 344.756 493.551 351.183 491.07 359.269 491.07 C 365.903 491.07 371.916 493.758 377.721 499.339 C 383.111 504.921 386.014 510.915 386.014 517.53 C 386.014 525.592 383.318 532 378.135 537.168 C 372.745 542.336 366.525 545.024 359.269 545.024 C 351.183 545.024 344.756 542.336 339.573 537.375 C 334.597 532.414 331.902 525.799 331.902 517.53 Z',

    // treble clef
    /*data: 'M 253.15412,641.98044 C 240.6871,644.53718 229.13339,651.37787 218.10574,662.2748 C 207.06431,673.37176 201.15385,686.02874 200.18764,700.03186 C 199.58032,708.83382 201.89814,719.04359 206.98199,730.04721 C 212.05202,741.25086 220.33707,749.66139 231.42225,755.45119 C 235.17713,756.51425 236.84387,758.63923 236.65063,761.43985 C 236.58163,762.44008 235.10888,763.34345 231.64465,763.90841 C 213.71382,758.04827 199.35035,747.20836 188.72718,731.80259 C 178.1178,716.19679 173.26131,698.97795 174.18533,679.74601 C 176.20862,659.18294 183.75015,640.4076 196.79611,623.62002 C 210.05642,606.64625 226.36686,595.10886 245.72747,589.00783 L 236.79086,517.03732 C 204.14235,540.5122 177.24023,565.38857 155.85634,592.05266 C 134.48625,618.51673 122.37548,648.03162 119.32349,680.58353 C 118.71694,695.21445 120.7449,709.62515 125.42117,723.6156 C 130.08363,737.80609 137.65014,750.78998 148.09311,762.96737 C 169.19336,787.1359 197.85701,800.97248 233.66922,804.64946 C 245.9568,804.6933 259.14313,803.39219 273.42874,800.75994 L 253.15412,641.98044 z M 267.73035,640.97623 \
    L 288.39876,796.96892 C 320.13628,786.69698 337.44053,760.75637 340.28393,719.5472 C 339.43155,705.61961 336.27671,692.94012 330.21782,681.46722 C 324.37326,669.80814 316.15723,660.39737 305.36919,653.22112 C 294.58117,646.04485 282.16857,641.97245 267.73035,640.97623 z M 240.97652,430.09347 C 247.87009,426.54918 255.97336,420.07342 264.87148,410.83853 C 273.75577,401.80367 282.56376,390.95461 291.06731,378.67754 C 299.7852,366.21426 306.91264,353.44025 312.44965,340.35552 C 317.97284,327.47082 321.04827,315.02021 321.84883,303.41763 C 322.1939,298.41652 322.13791,293.38773 321.43893,288.91757 C 321.1337,281.66062 319.31434,275.90719 315.76652,271.84344 C 312.20488,267.97974 307.53017,265.64723 301.51426,265.23213 C 289.4824,264.40196 278.14303,271.05643 267.49615,285.19557 C 259.19312,297.48648 251.92765,312.26093 246.32892,329.16035 C 240.51587,346.24598 236.72192,363.26995 235.12001,380.64614 C 234.75619,400.51973 236.84665,416.94472 240.97652,430.09347 z M 227.54252,440.82436 C 220.7547,407.79451 218.0189,374.44125 219.33512,340.7646 C 221.02637,319.17364 224.6263,299.12134 230.13492,280.60771 C 235.443,262.08026 242.37643,246.27791 250.96279,232.80059 C 259.34864,219.30942 268.703,209.30203 278.8254,202.76456 C 287.8899,196.95811 294.34101,193.98628 297.75004,194.2215 C 300.35693,194.40137 302.49376,195.5538 304.37484,197.49257 C 306.25592,199.43134 308.65578,202.61187 311.58822,206.83414 C 333.11869,242.2882 342.33476,283.92746 339.04967,331.53805 C 337.48995,354.14308 332.96368,375.94043 325.42943,397.53023 C 318.10954,418.93382 308.05121,439.14348 295.28207,457.75912 C 282.29861,476.56098 267.48927,492.62389 250.63973,506.13406 \
    L 261.4444,586.07234 C 270.33676,585.68092 276.4079,585.29584 279.81692,585.53105 C 295.05727,586.58262 308.47251,590.72422 320.66425,597.99733 C 332.856,605.27046 343.09115,614.61953 351.15534,626.23078 C 359.23334,637.64199 365.19561,650.51519 369.04215,664.85037 C 372.68816,679.17172 374.28745,693.95485 373.23843,709.15822 C 371.6097,732.76348 363.90253,753.93935 350.13074,772.48581 C 336.35896,791.03227 316.72959,803.94864 291.02831,811.42115 C 291.95622,821.33401 293.78364,835.73089 296.73873,854.22552 C 299.47947,872.90635 301.47983,887.71712 302.73979,898.65786 C 303.99974,909.59862 304.08411,920.05632 303.38016,930.25857 C 302.28974,946.06218 297.51346,959.80229 289.0375,971.67927 C 280.36103,983.5424 269.27089,992.42505 255.56657,998.31336 C 242.06276,1004.2155 227.3899,1006.62 211.74849,1005.5407 C 189.69011,1004.0188 170.86705,996.48913 155.26549,983.15182 C 139.67775,969.61453 132.00003,952.402 132.66101,931.14185 C 133.91134,921.78137 136.7245,913.13158 141.31484,905.00644 C 145.90518,896.8813 151.7888,890.45337 159.16626,885.7365 C 166.35698,880.80571 174.77199,878.57239 184.23834,878.6226 C 192.05904,879.16223 199.32685,881.87464 206.05556,886.55989 C 212.56994,891.43129 217.78453,897.61996 221.48497,905.31218 C 224.98487,912.99057 226.62479,921.34461 226.01747,930.14655 C 225.2031,941.94918 220.50235,951.67462 211.91519,959.32299 C 203.32805,966.97136 192.81111,970.46672 180.57874,969.62261 \
    L 175.96653,969.3044 C 182.95906,981.84671 195.36513,988.93363 213.21238,990.16507 C 222.23626,990.78767 231.59871,989.42374 241.07158,986.45942 C 250.75877,983.30886 258.92455,978.84733 265.98375,972.90252 C 273.04297,966.95762 277.92394,960.46055 280.22561,953.38354 C 284.20056,945.41695 286.59157,934.1251 287.57157,919.92194 C 288.23411,910.31982 287.89399,900.64853 286.75175,890.92184 C 285.59571,881.39523 283.65786,868.59871 280.9244,852.73232 C 278.17714,837.06602 276.19788,824.86961 275.15956,816.55712 C 262.92065,818.7276 250.37733,819.47011 237.34282,818.57075 C 215.48498,817.06258 195.13396,811.23643 176.30361,800.8923 C 157.47325,790.54817 141.28391,776.96931 127.54886,759.94186 C 114.01434,742.92824 103.82635,724.13556 97.012476,703.16372 C 90.385334,682.40576 87.637294,660.91049 88.955072,638.89176 C 91.165089,618.54256 96.327852,599.20109 104.81683,581.29511 C 113.3196,563.18906 123.75867,546.22163 136.32076,530.60666 C 148.88285,514.99169 161.74938,500.8047 174.90655,488.24575 C 188.25045,475.90066 205.66669,460.01763 227.54252,440.82436 z',
    */
  });
  layer.add(apathy);
}
