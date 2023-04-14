// :: Beat Detect Variables
// how many draw loop frames before the beatCutoff starts to decay
// so that another beat can be triggered.
// frameRate() is usually around 60 frames per second,
// so 20 fps = 3 beats per second, meaning if the song is over 180 BPM,
// we wont respond to every beat.
var beatHoldFrames = 5;

// what amplitude level can trigger a beat?
var beatThreshold = 0.11;

// When we have a beat, beatCutoff will be reset to 1.1*beatThreshold, and then decay
// Level must be greater than beatThreshold and beatCutoff before the next beat can trigger.
var beatCutoff = 0;
var beatDecayRate = 0.98; // how fast does beat cutoff decay?
var framesSinceLastBeat = 0; // once this equals beatHoldFrames, beatCutoff starts to decay.

let SHOW_GIF = false;
let SHOW_DVD = false;

let x;
let y;

let xspeed;
let yspeed;

let beatScaleFactor = 1;
let beatScaleAdd = 0;
let beatScaleFactorDecay = 0.7;

let song, analyzer;

let mic, fft;

let fd;
let volumeScaleFactor;

let r, g, b;

function preload() {
  fd = loadImage("fd.png");
  large_fd = loadImage("fd_large.png");
  fd_gif = loadImage("fd_gif.gif");
}

function setup() {
  // SETUP TIMERS ! -----------------
  //
  // Toutes les INTERVAL_DVD_MINUTES minutes, afficher le DVD pendant 1 minute
  let INTERVAL_DVD_MINUTES = 1;
  setInterval(() => {
    SHOW_DVD = !SHOW_DVD;
    // show DVD for 1 minute
    setTimeout(() => {
      SHOW_DVD = !SHOW_DVD;
    }, 0.08 * 60 * 1000);
  }, INTERVAL_DVD_MINUTES * 60 * 1000);

  // Toutes
  let INTERVAL_GIF_MINUTES = 0.05;
  setInterval(() => {
    SHOW_GIF = !SHOW_GIF;
    // show DVD for 1 minute
    setTimeout(() => {
      SHOW_GIF = !SHOW_GIF;
    }, 0.25 * 60 * 1000);
  }, INTERVAL_GIF_MINUTES * 60 * 1000);

  // ------------------------

  let scale = 0.7;

  fd.resize(fd.width * scale, fd.height * scale);
  // fd_gif.resize(fd_gif.width * 1.2, fd_gif.height * 0.8);
  createCanvas(windowWidth, windowHeight);
  x = random(width);
  y = random(height);
  xspeed = 3;
  yspeed = 3;
  pickColor();

  //Analyzer
  // create a new Amplitude analyzer
  analyzer = new p5.Amplitude();
  analyzer.setInput(mic);
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT();
  fft.setInput(mic);
}
// UPDATE
function draw() {
  var level = mic.getLevel(0.5);
  //Volume scale factor
  volumeScaleFactor = map(level, 0, 1, 1, 2);
  detectBeat(level);

  background(0);

  if (SHOW_DVD) {
    drawDVD();
  } else {
    drawLogoCenter(large_fd);
    drawWave();
    drawFFT();
  }
}

// ------------------------

function drawLogoCenter(img, p = 0.6) {
  let psf = pulsingScaleFactor();

  let imgHeight = height * p;
  let imgWidth = (imgHeight * img.width) / img.height;
  drawWobblyShape();
  imageMode(CENTER);
  let scaleLogo = 0.7;

  if (SHOW_GIF) {
    let scaleFactorGIF = 1.35;
    image(
      fd_gif,
      width / 2,
      height / 2,
      imgWidth * scaleLogo * psf * scaleFactorGIF * 1.01,
      imgHeight * scaleLogo * psf * scaleFactorGIF * 1.09
    );
  } else {
    image(
      img,
      width / 2,
      height / 2,
      imgWidth * scaleLogo * psf,
      imgHeight * scaleLogo * psf
    );
  }
}

function mousePressed() {
  let fs = fullscreen();
  fullscreen(!fs);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function scaleImage(img, scale) {
  img.resize(img.width * scale, img.height * scale);
}

function drawWobblyShape() {
  fill(250, 196, 211);
  beginShape();

  let points = 30;

  let rad = height * 0.35;
  let wb = rad * 0.6;
  let sp = 0.005;
  let f = frameCount * sp;
  for (let i = 0; i < points; i++) {
    randomSeed(i);
    let rnd1 = random(0, i);
    randomSeed(i);
    let rnd2 = random(0, f * sp);
    let fq1 = (i * (PI * 2)) / points;
    let fq2 = (i * rnd1 + f) * (PI * 2);
    let sz = rad / 5;
    // WIDTH
    let cx = width / 1.95;
    let x = cx + (sin(fq1) + sin(fq2) / sz) * rad;
    // HEIGHT
    let cy = height / 2;
    let y = cy + (cos(fq1) + cos(fq2) / sz) * rad;
    curveVertex(x, y);
  }
  endShape(CLOSE);
  noFill();
}

function pulsingScaleFactor() {
  let amplitude = 0.02;
  let speed = 0.015;
  return 1 + amplitude * sin(frameCount * speed);
}

function drawDVD() {
  tint(r, g, b);
  imageMode(CORNER);
  image(fd, x, y);
  noTint();

  x = x + xspeed;
  y = y + yspeed;

  if (x + fd.width >= width) {
    xspeed = -xspeed;
    x = width - fd.width;
    pickColor();
  } else if (x <= 0) {
    xspeed = -xspeed;
    x = 0;
    pickColor();
  }

  if (y + fd.height >= height) {
    yspeed = -yspeed;
    y = height - fd.height;
    pickColor();
  } else if (y <= 0) {
    yspeed = -yspeed;
    y = 0;
    pickColor();
  }
}

function pickColor() {
  randomSeed();
  r = random(100, 256);
  g = random(100, 256);
  b = random(100, 256);
}

function drawFFT() {
  // Get the average (root mean square) amplitude
  let rms = analyzer.getLevel();
  // fill(250, 196, 211);
  // fill(r, g, b);
  stroke(255, 255, 255, 155);

  let spectrum = fft.analyze();

  beginShape();
  vertex(0, height);
  vertex(0);
  for (i = 0; i < spectrum.length; i++) {
    vertex(
      map(i, 0, spectrum.length, 0, width),
      map(spectrum[i], 0, 255, height, 0.5 * height)
    );
  }
  vertex(width, height);
  endShape();
  noFill();
  noStroke();
}

function detectBeat(level) {
  beatScaleAdd *= beatScaleFactorDecay;
  beatScaleFactor = 1 + beatScaleAdd;
  if (level > beatCutoff && level > beatThreshold) {
    onBeat();
    beatCutoff = level * 1.2;
    framesSinceLastBeat = 0;
  } else {
    if (framesSinceLastBeat <= beatHoldFrames) {
      framesSinceLastBeat++;
    } else {
      beatCutoff *= beatDecayRate;
      beatCutoff = Math.max(beatCutoff, beatThreshold);
    }
  }
}

function onBeat() {
  console.log("beat!");
  beatScaleAdd += 0.1;
  // pickColor();
}

function drawWave() {
  angleMode(DEGREES);
  stroke(255);
  stroke(250, 196, 211);
  // fill(250, 196, 211);
  strokeWeight(3);
  let offset = 20;
  translate(width / 2 + offset, height / 2);

  for (let t = -1; t <= 1; t += 2) {
    beginShape();
    let HEIGHT = (height / 2.5) * beatScaleFactor;
    let wave = fft.waveform();
    curveVertex(HEIGHT * sin(0) * t, HEIGHT * cos(0));
    for (let i = 0; i < 181; i += 1) {
      let index = floor(map(i, 0, 180, 0, wave.length - 1));

      let r = map(wave[index], -1, 1, HEIGHT - 50, HEIGHT + 100);
      let x = r * sin(i) * t;
      let y = r * cos(i);
      curveVertex(x, y);
    }
    curveVertex(HEIGHT * sin(180) * t, HEIGHT * cos(180));
    endShape();
  }

  strokeWeight(0.5);
  noStroke();
  translate(-width / 2 - offset, -height / 2);
  angleMode(RADIANS);
}
