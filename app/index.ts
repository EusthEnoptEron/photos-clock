import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { inbox } from 'file-transfer';
import { readFileSync, listDirSync, DirectoryIteratorResult, unlinkSync, writeFileSync, existsSync} from 'fs';
import { MediaItemLite } from 'photos-clock';
import {MessageBus } from '../common/message-bus';
import dayjs from 'dayjs'

const messageBus = new MessageBus(true);

// Update the clock every minute
clock.granularity = "minutes";

// Get a handle on the <text> element

const myLabel = document.getElementById("myLabel");
const background = document.getElementById("background");
const bgImage = document.getElementById("bg-image") as ImageElement;
const albumName = document.getElementById("album-name") as TextElement;
const photoDate = document.getElementById("photo-date") as TextElement;
const currentDate = document.getElementById("current-date") as TextElement;

function tween(startValue: number, endValue: number, durationMillis: number, applyFn: (number) => void): Promise<number> {
  return new Promise<number>(resolve => {
    const startTime = new Date().getTime();
    const diff = endValue - startValue;
  
    function update() {
      const t = (new Date().getTime() - startTime) / durationMillis;
      if(t >= 1) {
        applyFn(endValue);
        resolve(endValue);
        return;
      }
  
      applyFn(startValue + diff * t);
      requestAnimationFrame(update);
    }
  
    update();
  });
  
}


function initBG() {
  const listDir = listDirSync("/private/data");
  let dirIt: DirectoryIteratorResult;

  while((dirIt = listDir.next()) && !dirIt.done) {
    if(dirIt.value.indexOf(".jpg") >= 0) {
      bgImage.href = "/private/data/" + dirIt.value;
      break;
    }
  }


  let lastRefreshTime = 0;
  let lastClickTime = 0;
  

  background.onclick = () => {
    const clickTime = new Date().getTime();
    if((clickTime - lastClickTime) < 250 && (clickTime - lastRefreshTime) > 1000) {
      lastRefreshTime = clickTime;

      tween(bgImage.style.opacity, 0.0, 250, opacity => bgImage.style.opacity = opacity);

      messageBus.send({
        type: "Refresh"
      });
      
    }
    lastClickTime = clickTime;
  }
}

function updateText(mediaItem: MediaItemLite) {
  albumName.text = mediaItem.albumName;
  const date = Date.parse(mediaItem.creationTime)
  photoDate.text = util.timeAgo(date);
}

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  if (preferences.clockDisplay === "12h") {
    // 12h format
    hours = hours % 12 || 12;
  } else {
    // 24h format
    hours = util.zeroPad(hours);
  }
  let mins = util.zeroPad(today.getMinutes());
  myLabel.text = `${util.monoDigits(hours)}:${util.monoDigits(mins)}`;
  currentDate.text = dayjs().format("DD.MM.YYYY");
}

async function processDownload() {
  let filename;

  while(filename = inbox.nextFile()) {
    // renameSync(filename, "bg.jpg")
    console.log("new image: " + filename);

    await tween(bgImage.style.opacity, 0.0, 250, opacity => bgImage.style.opacity = opacity);

    bgImage.href = `/private/data/${filename}`

    const listDir = listDirSync("/private/data");
    let dirIt: DirectoryIteratorResult;

    while((dirIt = listDir.next()) && !dirIt.done) {
      if(dirIt.value == filename || dirIt.value == "data.txt") continue;
      
      console.log("delete " + dirIt.value);
      unlinkSync("/private/data/" + dirIt.value);
      // todelete.push(dirIt.value);
    }


    await tween(bgImage.style.opacity, 1.0, 250, opacity => bgImage.style.opacity = opacity);


    // const files = [...listDirSync("/private/data/")];
    
    // bgImage.image
    // bgImage.href = "/private/data/bg.jpg"
  }
}


messageBus.onMessage = (msg) => {
  if (msg.type == "MediaItem") {
    writeFileSync("data.txt", msg.data as MediaItemLite, "cbor");
    updateText(msg.data as MediaItemLite);
    // myLabel.text = (msg.data as MediaItemLite).name;
  }
}

inbox.onnewfile = processDownload;
processDownload();

document.onclick = (e) => {
  //@ts-ignore
  myLabel.style.fill = "blue"
}

initBG();

if(existsSync("data.txt")) {
  updateText(readFileSync("data.txt", "cbor") as MediaItemLite);
}