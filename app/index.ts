import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import {MessageBus } from '../common/message-bus';
import dayjs from 'dayjs'
import { PhotoEvent, StateManager } from './state-manager';
import { EventQueue } from './event-queue';
import { PhotoManager } from './photo-manager';
import { PhotoExchange } from './photo-exchange';
import { tween } from './utils';

// Update the clock every minute
clock.granularity = "minutes";

console.log("starting...");
const messageBus = new MessageBus(true);
const stateManager = new StateManager(new EventQueue());
const photoManager = new PhotoManager(stateManager, new PhotoExchange(messageBus));
console.log("still starting...");

// Get a handle on the <text> element

const myLabel = document.getElementById("myLabel");
const background = document.getElementById("background");
const bgImage = document.getElementById("bg-image") as ImageElement;
const albumName = document.getElementById("album-name") as TextElement;
const photoDate = document.getElementById("photo-date") as TextElement;
const currentDate = document.getElementById("current-date") as TextElement;


async function onIndexChanged(e: PhotoEvent) {
  // Hide old one
  await tween(bgImage.style.opacity, 0.0, 250, opacity => bgImage.style.opacity = opacity);

  bgImage.href = `/private/data/${e.photo.filename}`;
  bgImage.enabled = false;
  bgImage.enabled = true;
  albumName.text = e.photo.albumName;
  const date = Date.parse(e.photo.creationTime)
  photoDate.text = util.timeAgo(date);
  
  // Show new one
  await tween(bgImage.style.opacity, 1.0, 250, opacity => bgImage.style.opacity = opacity);
}


function init() {
  // 
  // Handle click on image
  // 
  let lastRefreshTime = 0;
  let lastClickTime = 0;
  background.onclick = () => {
    const clickTime = new Date().getTime();
    if((clickTime - lastClickTime) < 250 && (clickTime - lastRefreshTime) > 1000) {
      lastRefreshTime = clickTime;

      photoManager.nextPhoto();
    }
    lastClickTime = clickTime;
  }

  //
  // Update the <text> element every tick with the current time
  //
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

  stateManager.addEventListener("indexChanged", onIndexChanged);
  if(stateManager.currentIndex !== null) {
    onIndexChanged({
      index: stateManager.currentIndex,
      photo: stateManager.getPhoto(stateManager.currentIndex).data
    });
  }
}


init();