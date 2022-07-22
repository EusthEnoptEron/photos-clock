import { AppState, PhotoInfo } from './types';
import { writeFileSync, readFileSync } from 'fs';
import { MediaItemLite } from 'photos-clock';
import { EventQueue } from './event-queue';

export type EventName = "photoAdded" | "indexChanged";

export const DATA_FILE = "state.txt";

export interface PhotoEvent {
    photo: MediaItemLite,
    index: number
};

export class StateManager {
    private state: AppState;

    private eventHandlers: { [key: string]: ((e: any) => void)[] } = {}

    addEventListener(eventName: "photoAdded", handler: (e: PhotoEvent) => void)
    addEventListener(eventName: "indexChanged", handler: (e: PhotoEvent) => void)
    addEventListener(eventName: EventName, handler: (e: any) => void) {
        let handlerList = this.eventHandlers[eventName];
        if (!handlerList) {
            this.eventHandlers[eventName] = handlerList = [];
        }

        handlerList.push(handler);
    }

    private emit(eventName: EventName, e: any) {
        const handlerList = this.eventHandlers[eventName];
        if (handlerList) {
            for (let handler of handlerList) {
                // Keep stack small
                this.eventQueue.post(() => {
                    handler(e);
                });
            }
        }
    }

    constructor(
        private eventQueue: EventQueue
    ) {
        try {
            this.state = readFileSync(DATA_FILE, "cbor") as AppState;

            // Can't be in progress anymore.
            for(const photo of this.state.photos) {
                photo.inProgress = false;
            }

            console.log("State initialized.");
        } catch {
            // Init new app state
            console.log("No app state found, creating new one.");

            this.state = {
                currentIndex: null,
                photos: []
            };

            this.save();
        }
    }

    /**
     * Saves the state.
     */
    private save() {
        console.log("Saving state.");
        writeFileSync(DATA_FILE, this.state, "cbor");
    }

    get anyInProgress(): boolean { return this.state.photos.some(p => p.inProgress) }
    get photos(): MediaItemLite[] { return this.state.photos.map(p => p.data).filter(p => p !== null) }
    get currentIndex(): number | null { return this.state.currentIndex }
    get nextIndex(): number { return this.state.currentIndex === null ? 0 : ((this.state.currentIndex + 1) % this.photoCount)  }
    get photoCount(): number { return this.state.photos.length }

    get unaccountedPhotos(): number[] { return this.state.photos.map((el, i) => [el, i] as [PhotoInfo, number]).filter(pair => pair[0].inProgress === false && pair[0].data === null).map(pair => pair[1]) }

    setCount(count: number) {
        this.ensureIndexIsAvailable(count - 1);
    }

    // moveToNextPhoto() {
    //     if(this.currentIndex === null) {

    //     }

    // }

    set currentIndex(index: number) {
        console.log("Setting index: " + index);
        this.state.currentIndex = index;
        this.save();

        this.emit("indexChanged", {
            index,
            photo: this.state.photos[index].data
        } as PhotoEvent);
    }



    /**
     * Starts progress loading a photo.
     * @param index 
     */
    startProgress(index: number) {
        console.log("Starting progress on " + index);
        this.ensureIndexIsAvailable(index);

        if(this.state.photos[index].inProgress) {
            throw "Already in progress";
        }

        this.state.photos[index].data = null;
        this.state.photos[index].inProgress = true;

        this.save();
    }

    /**
     * Stops progress loading a photo, ideally with some data.
     * @param index 
     * @param data 
     */
    finalize(index: number, data: MediaItemLite | null) {
        if (index >= this.state.photos.length) {
            console.warn(`Unknown index ${index} (number of photos: ${this.state.photos.length}) -- creating remaining ones`);
            this.ensureIndexIsAvailable(index);
        }

        this.state.photos[index].data = data;
        this.state.photos[index].inProgress = false;

        this.save();
        this.emit("photoAdded", {
            index,
            photo: this.state.photos[index].data
        } as PhotoEvent);
    }

    getPhoto(index: number) {
        this.ensureIndexIsAvailable(index);
        return this.state.photos[index];
    }

    private ensureIndexIsAvailable(index: number) {
        // Fill up until index, just in case
        while (this.state.photos.length <= index) this.state.photos.push({ data: null, inProgress: false })
    }


}