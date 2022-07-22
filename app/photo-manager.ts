import { inbox } from 'file-transfer';
import { MediaItemLite } from 'photos-clock';
import { PhotoExchange } from './photo-exchange';
import { DATA_FILE, PhotoEvent, StateManager } from './state-manager';
import { PhotoInfo } from './types';
import { DirectoryIteratorResult, listDirSync, unlinkSync } from 'fs';

const CACHE_SIZE = 5;
const MAX_ERROR_COUNT = 10;

export class PhotoManager {

    constructor(
        private stateManager: StateManager,
        private photoExchange: PhotoExchange
    ) {
        this.stateManager.addEventListener("photoAdded", e => this.onPhotoAdded(e))
        this.stateManager.addEventListener("indexChanged", e => this.onIndexChanged(e))
        this.fill();


        inbox.onnewfile = () => this.processTransfers();
    }

    /**
     * Fill cache with photos.
     */
    private async fill() {
        console.log("Starting filling up...");
        // We're not fully initialized!
        if (this.stateManager.photoCount < CACHE_SIZE) {
            this.stateManager.setCount(CACHE_SIZE);
        }

        let errorCount = 0;
        let unaccountedPhotos = this.stateManager.unaccountedPhotos;
        while (unaccountedPhotos.length > 0 && errorCount < MAX_ERROR_COUNT) {
            const index = unaccountedPhotos[0];

            try {
                await this.fetchPhoto(index);
            } catch (e) {
                console.error(e);
                errorCount++;
            }

            unaccountedPhotos = this.stateManager.unaccountedPhotos;
        }

        console.log("Done filling up!");
    }

    private async fetchPhoto(index: number): Promise<MediaItemLite> {
        this.stateManager.startProgress(index);

        try {
            const photo = await this.photoExchange.getPhoto(index);
            this.stateManager.finalize(index, photo);

            return photo;
        } catch (e) {
            this.stateManager.finalize(index, null);
            throw e;
        }
    }

    private onPhotoAdded(e: PhotoEvent): void {
        if (this.stateManager.currentIndex === null) {
            this.stateManager.currentIndex = e.index;
        }

        this.cleanup();
    }

    private async onIndexChanged(e: PhotoEvent) {
        const count = this.stateManager.photoCount;
        const previousIndex = (e.index + count - 1) % count;

        // Get a replacement for the previous photo
        try {
            await this.fetchPhoto(previousIndex);
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Request next photo and increment index.
     */
    async nextPhoto() {
        const nextIndex = this.stateManager.nextIndex;
        const nextPhoto = this.stateManager.getPhoto(nextIndex);

        if (nextPhoto.data) {
            // Increment
            this.stateManager.currentIndex = nextIndex;
        } else {
            if (nextPhoto.inProgress) {
                // Accounted for, do nothing.
                console.log("ignoring because already in progress.")
                return;
            }

            // Try to get the photo
            try {
                await this.fetchPhoto(nextIndex);
                // Apply it.
                this.stateManager.currentIndex = nextIndex;
            } catch (e) {
                console.error(e);
            }
        }

    }

    private cleanup() {
        // Only clean up when nothing's in progress
        if (this.stateManager.anyInProgress) return;

        const knownFilenames = this.stateManager.photos.map(p => p.filename);
        const listDir = listDirSync("/private/data");
        let dirIt: DirectoryIteratorResult;
    
        while((dirIt = listDir.next()) && !dirIt.done) {
          if(knownFilenames.indexOf(dirIt.value) >= 0 || dirIt.value == DATA_FILE) continue;
          
          console.log("deleting " + dirIt.value);
          unlinkSync("/private/data/" + dirIt.value);
        }
    }

    private processTransfers() {
        let filename;

        while (filename = inbox.nextFile()) {
            // renameSync(filename, "bg.jpg")
            console.log("Received image: " + filename);

            this.photoExchange.acknowledgeReception(filename);
        }
    }
}