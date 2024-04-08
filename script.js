class Pen{
  constructor(_size, _color,_ctx){
    this.type = "Pen";
    this.size = _size;
    this.color = _color;
    this.ctx = _ctx;
    this.isDown = false;
  }
  
  drawTo(_x,_y){
    this.ctx.beginPath();
    this.ctx.arc(_x, _y, this.size, 0, Math.PI * 2, false);
    this.ctx.fill();
  }
  
  changeColorTo(_newColor){
    this.color = _newColor;
    this.ctx.fillStyle = this.color;
  }
}

let isTouch = ('ontouchstart' in window);

const WIDTH = 300;
const HEIGHT = 300;

const PEN_PREVIEW_CANVAS_WIDTH = 70;
const PEN_PREVIEW_CANVAS_HEIGHT = 70;

const ROTATE_TIME_ON_VIDEO = 1; // GIFで保存するのは何回転分か

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const canvasForDownloadAsVideo = document.getElementById("canvasForDownloadAsVideo");
const canvasForDownloadAsVideoCtx = canvasForDownloadAsVideo.getContext("2d");

const penSizeInput = document.getElementById("pen-size-input");
const rotationSpeedInput = document.getElementById("rotation-speed-input");

const penPreviewCanvas = document.getElementById("pen-preview-canvas");
const penPreviewCanvasCtx = penPreviewCanvas.getContext("2d");

const downloadDiv = document.getElementById("downloadDiv");
const GIFDownloadProgress = document.getElementById("GIFDownloadProgress");

let penX = 0;
let penY = 0;

let isCreatingGIF = false;
let completedFramesNum = 0;
let frameNum = 0;


let encoder;

// initialize

canvas.width = WIDTH;
canvas.height = HEIGHT;

// canvas.style.backgroundColor = "white";
const startCanvasX = window.pageXOffset + canvas.getBoundingClientRect().left;
const startCanvasY = window.pageYOffset + canvas.getBoundingClientRect().top;
const canvasCenterX = startCanvasX + canvas.width/2;
const canvasCenterY = startCanvasY + canvas.height/2;

ctx.fillStyle = "white";
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle = "black";

penPreviewCanvas.width = PEN_PREVIEW_CANVAS_WIDTH;
penPreviewCanvas.height = PEN_PREVIEW_CANVAS_HEIGHT;

const pen = new Pen(5,"black",ctx);
const previewPen = new Pen(5, "black", penPreviewCanvasCtx);

canvasForDownloadAsVideo.width = WIDTH;
canvasForDownloadAsVideo.height = HEIGHT;

canvasForDownloadAsVideoCtx.fillStyle = "white";
canvasForDownloadAsVideoCtx.fillRect(0,0,canvasForDownloadAsVideo.width,canvasForDownloadAsVideo.height);


// console.log(startCanvasX, startCanvasY);

let angle = 0;
let speed = 0.5; // 回転速度を制御する変数 0.5?
const interval = 5; // アニメーションの間隔を制御する変数

previewPen.drawTo(penPreviewCanvas.width/2, penPreviewCanvas.height/2);


// logic

// 要素を回転させる関数
function rotateElement() {
  if(pen.isDown){
    if(!isCreatingGIF) pen.drawTo(penX,penY);
    [penX,penY] = nextPos(penX,penY,speed);
    // console.log(angle);
  }
  angle += speed; // 角度をspeed分だけ増加させる
  angle %= 361;
  canvas.style.transform = `rotate(${angle}deg)`; // 要素に回転角度を適用する
  document.getElementById("rotation-visualize-div").style.transform = `rotate(${angle}deg)`;
  
  
  canvasForDownloadAsVideoCtx.fillRect(0,0,canvasForDownloadAsVideo.width, canvasForDownloadAsVideo.height);
  
  //GIF保存用のcanvasも中心軸でspeedの分回転させる
  canvasForDownloadAsVideoCtx.translate(WIDTH/2,HEIGHT/2);
  canvasForDownloadAsVideoCtx.rotate(convertToRad(speed));
  canvasForDownloadAsVideoCtx.translate(-WIDTH/2,-HEIGHT/2);
  
  canvasForDownloadAsVideoCtx.drawImage(canvas,0,0);
  
  if(isCreatingGIF){
    
    
    completedFramesNum++;
    GIFDownloadProgress.value = completedFramesNum;
    encoder.addFrame(canvasForDownloadAsVideoCtx);
    if(frameNum <= completedFramesNum){ // 必要なコマが全て揃ったら
      
      isCreatingGIF = false;
      //アニメGIFの生成
      encoder.finish();
      
      downloadDiv.style.display = "none";
      
      const a = document.createElement("a");
      a.href = 'data:image/gif;base64,' + encode64(encoder.stream().getData());
      a.download = 'image.gif';
      a.click();
    }
  }
  
  
  setTimeout(rotateElement, interval); // 一定間隔で関数を再度実行する
}


rotateElement(); // 初回実行

penSizeInput.addEventListener("change", (e) => {
  pen.size = Number(penSizeInput.value);
  
});

penSizeInput.addEventListener("input", (e) =>{
  previewPen.size = Number(penSizeInput.value);
  penPreviewCanvasCtx.clearRect(0,0,penPreviewCanvas.width,penPreviewCanvas.height);
  previewPen.drawTo(penPreviewCanvas.width/2,penPreviewCanvas.height/2);
});


rotationSpeedInput.addEventListener("change", (e) => {
  speed = Number(rotationSpeedInput.value);
});

$("#canvas").bind({
  "mousedown touchstart": function(e){
    e.preventDefault();
    penX = (isTouch ? e.changedTouches[0].pageX : e.pageX);
    penY = (isTouch ? e.changedTouches[0].pageY : e.pageY);

    [penX,penY] = getPosInCanvas(penX,penY,angle);
    pen.isDown = true;
    
  },
  "mousemove touchmove": function(e){
    e.preventDefault();
    penX = (isTouch ? e.changedTouches[0].pageX : e.pageX);
    penY = (isTouch ? e.changedTouches[0].pageY : e.pageY);

    [penX,penY] = getPosInCanvas(penX,penY,angle);
  },
  "mouseup touchend": function(e){
    e.preventDefault();
    pen.isDown = false;
  }
});

// nowRotationAngle := この関数が実行される時点でのcanvasのすでに回転した角度
function getPosInCanvas(pageX,pageY,nowRotationAngle){
  let theta = 0;
  
  let xInCanvas = pageX - startCanvasX;
  let yInCanvas = pageY - startCanvasY;
  // console.log(xInCanvas, yInCanvas);
  let cx = xInCanvas-150;
  let cy = -(yInCanvas-150);
  // console.log(cx,cy);
  const dis = Math.sqrt(cx**2 + cy**2);
  
  theta = Math.atan2(cy,cx) * (180 / Math.PI);
  // console.log(cx,cy,theta);
  
  // いままでに回転した分をthetaに反映させる
  const resPosTheta = theta+nowRotationAngle;
  // console.log(resPosTheta);
  const nextX = dis*Math.cos(resPosTheta*(Math.PI/180));
  const nextY = dis*Math.sin(resPosTheta*(Math.PI/180));
  // console.log(nextX,nextY);
  
  // 描画用にcanvasの座標に変換する
  const resX = nextX+150;
  const resY = -nextY+150;
  // console.log(resX,resY);
  
  return [resX,resY];
}

function nextPos(x,y,angle){
  // angle deg時計回りに回ったときの次の座標(canvas上の座標を返す)  
  let theta = 0; // 点P(x,y),原点O(150,150)について、線分POとx軸が成す角
  let cx = x-150; // canvas 内のx,y(点O(150,150)が中心) 右上に連れて値が大きくなるような座標軸
  let cy = -(y-150);
  
  const dis = Math.sqrt(cx**2 + cy**2); // 線分POの長さ
  
  theta = Math.atan2(cy,cx) * (180 / Math.PI);
  // console.log(cx,cy,theta);
  
  
  const nextPosTheta = theta+angle;// 点Q(nextX,nextY),原点O(150,150)について、線分QOとx軸が成す角(theta+angle) 単位はdeg!
  let nextX,nextY;
  nextX = dis*Math.cos(nextPosTheta*(Math.PI/180));
  nextY = dis*Math.sin(nextPosTheta*(Math.PI/180));
  // console.log(nextX,nextY);
  
  // 描画用に本来のcanvasの座標に変換する
  const resX = nextX+150;
  const resY = -nextY+150;
  // console.log(resX,resY);
  return [resX,resY];
  
}

function changeColor(){
  pen.changeColorTo(document.getElementById("color-input").value);
  previewPen.changeColorTo(document.getElementById("color-input").value);
  previewPen.drawTo(penPreviewCanvas.width/2,penPreviewCanvas.height/2);
}


// download

function downloadAsImage(){
  const a = document.createElement("a");
  a.href = canvas.toDataURL("rotationPaint/png", 0.75); // PNGなら"image/png"
  a.download = "image.png";
  a.click();
}

function downloadAsVideo(){
  
  //GIFEncoderの初期処理
  encoder = new GIFEncoder();
  encoder.setRepeat(0); //繰り返し回数 0=無限ループ
  encoder.setDelay(interval); //1コマあたりの待機秒数（ミリ秒）
  encoder.start();
  
  
  frameNum = Math.round(360*ROTATE_TIME_ON_VIDEO/speed); // 何コマ分必要か
  completedFramesNum = 0;
  isCreatingGIF = true;
  
  downloadDiv.style.display = "block";
  GIFDownloadProgress.value = 0;
  GIFDownloadProgress.max = frameNum;

}

function interruptDownload(){
  isCreatingGIF = false;
  encoder.finish();
  downloadDiv.style.display = "none";
}

// other

window.onbeforeunload = (e) => {
    e.returnValue = "作業内容は破棄されますが、本当にページを離れますか?";
}

function wait(msec) {

  // jQueryのDeferredを作成します。
  var objDef = new $.Deferred;

  setTimeout(function () {

    // sec秒後に、resolve()を実行して、Promiseを完了します。
    objDef.resolve(msec);

  }, msec);

  return objDef.promise();

};

function convertToRad(deg){
  return deg*(Math.PI/180);
}
