
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
let roll, measure, hiddenTic, beatCtr = 0;

let quarterNote, quarterNoteFlipped, quarterNoteFlippedG, quarterNoteFlippedF,quarterNoteFlippedE, quarterNoteFlippedD, quarterNoteFlippedC, quarterNoteE, quarterNoteD, quarterNoteC, quarterNoteB, tooltip, animateNoteFunction;
let targetX, targetZoneWidth;
let lastNoteGenerated = {n:-1}; 

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

  // add the layer to the stage
  stage.add(layer);

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


  // draw the image
  layer.draw();

  createAndCacheElements();
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
}

// note relates to values in noteMapActuals
function renderNote(note) {
  // get noteIndex to staff line mapping given the instrument, and key
  let noteK;
  let staffLine = getStaffLine(note);
  //console.log('staffLine for note: ' + note.n + '=' + staffLine);
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
}

function findFirstUnplayedNote() {
  return findFirstUnplayedKonvaNote().getAttr(NOTE);
}

function findLeftMostNoteToPlay() {
  const g = findLeftMostGroupToPlay();
  if (g) {
    return g.getAttr(NOTE);
  }
  return null;
}

function releaseNoteAtTarget() {
  heardCnt = 0;
  const konvaNote = findFirstUnplayedKonvaNote();
  stopPad(konvaNote.getAttr(NOTE).f);
  konvaNote.setAttr(NOTE_PLAYED, true);
  // always make note visible in case user toggles 'hide' back and forth
  konvaNote.setAttr('visible', true);
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
  konvaNote.setAttr('visible', true);
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

function setNoteFunction(state) {
  if (state.func === FUNC_RANDO) {
    animateNoteFunction = generateRandomNote;
  }
  if (state.func === FUNC_ASC) {
    animateNoteFunction = generateAscendingKeyNote;
  }
  if (state.func === FUNC_DESC) {
    animateNoteFunction = generateDescendingKeyNote;
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

const nlm = {}; // noteLineMap for bass clef
let octaveLevel = 3;
const staffLines = 'GFEDCBA'.split(''); // starting at top G, 3rd line above staff
for (let i=0,j=0; i<20; i++,j=(j+1)%7) {
  const staffLine = staffLines[j];
  let h = staffLine + '#' + octaveLevel;
  nlm[h] = i;

  // line order here is important to change the level at B#
  if (staffLine + '#' === 'B#') { /*console.log('  lower level' );*/ octaveLevel--; }  // good for sharps

  h = staffLine + octaveLevel;
  nlm[h] = i;

  h = staffLine + 'b' + octaveLevel;
  nlm[h] = i;
}

function getStaffLine(note) {
  let key = keys[rcs.key];
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
