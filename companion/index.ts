import { settingsStorage } from "settings";
import { Album, AlbumList, MediaItem } from "google-photos";
import { GoogleClient } from './google-client';
import { MediaItemLite, Message, PhotoRequest } from 'photos-clock';
import { outbox } from 'file-transfer';
import { MessageBus } from '../common/message-bus';
import { getImageFilename } from '../common/utils';
import { getAlbumFilter } from './settings-helper';

const client = new GoogleClient();
const messageBus = new MessageBus();


function pickRandom<T>(list: T[], weightExtractor: ((el: T) => number) = i => 1): T | null {
  if (list.length == 0) return null;

  const sum = list.reduce((accumulator, curr) => accumulator + weightExtractor(curr), 0);

  console.log("SUM: " + sum);
  const needle = Math.random() * sum;

  let acc = 0;
  for (const item of list) {
    acc += weightExtractor(item);

    // console.log(acc);
    if (acc >= needle) {
      return item;
    }
  }

  console.log("OOPS - no candidate? List length: " + list.length);

  return null;
}

async function pickRandomMediaItem(albums: Album[], attemptNo: number = 0): Promise<[string, Album]> {
  const album = pickRandom(albums, a => parseInt(a.mediaItemsCount) || 0);
  const mediaItems = await client.getMediaItems(album);

  if (mediaItems.length == 0) {
    if (attemptNo > 5) {
      throw "Unable to find media item!";
    }

    return await pickRandomMediaItem(albums, attemptNo + 1);
  }

  return [
    pickRandom(mediaItems),
    album 
  ];
}

// Fetch Sleep Data from Fitbit Web API
async function fetchRandom(): Promise<[MediaItem, Album, ArrayBuffer]> {
  const albums = await client.getAlbums()

  const [mediaItem, album] = await pickRandomMediaItem(albums.filter(getAlbumFilter()));
  console.log(`Picked image ${mediaItem}`);

  const info = await client.getMediaItem(mediaItem);
  // And off you go
  const imageData = await client.download(mediaItem);

  return [info, album, imageData];
}

// A user changes Settings
settingsStorage.onchange = evt => {
  if (ignoreEvents) {
    console.log("Ignoring update");
    return;
  }

  if (evt.key === "oauth") {
    // Settings page sent us an oAuth token
    let data = JSON.parse(evt.newValue);
    console.log(data.refresh_token);
    client.login(data.access_token, data.refresh_token);
    // update();
  }
};

// Restore previously saved settings and send to the device
function restoreSettings() {
  let dataString = settingsStorage.getItem("oauth");
  if (dataString) {
    let data = JSON.parse(dataString)
    // console.log(data);
    client.login(data.access_token, data.refresh_token);
    // update();
  }
}

let ignoreEvents = false;

client.onAccessTokenUpdated = (accessToken) => {
  const data = JSON.parse(settingsStorage.getItem("oauth"));
  data.access_token = accessToken;
  try {
    ignoreEvents = true;
    settingsStorage.setItem("oauth", JSON.stringify(data));
  } finally {
    ignoreEvents = false;
  }
}

// Message socket opens
messageBus.waitForConnection().then(() => {
  restoreSettings();
});

messageBus.onMessage = async message => {
  if (message.type == "GetPhoto") {
    const request = message.data as PhotoRequest;

    console.log("Received refresh!");
    try {
      const [info, album, imageData] = await fetchRandom();

      const filename = new Date().getTime()+".jpg";
      await outbox.enqueue(filename, imageData);
      await messageBus.waitForResponse(filename);

      // Send response
      await messageBus.send({
        id: message.id,
        type: "GetPhoto",
        data: {
          id: info.id,
          name: info.filename,
          creationTime: info.mediaMetadata.creationTime,
          albumName: album.title,
          filename: filename
        } as MediaItemLite
      });

    } catch(e) {
      console.error(e);

      await messageBus.send({
        id: message.id,
        type: "Error",
        data: e
      });
    }
  } else if(message.type == "PhotoReceived") {
    // Handled elsewhere
  } else {
    console.log("Don't know what to do with the message of type: " + message.type);
  }
}