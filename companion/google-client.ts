import { Album, AlbumList, MediaItem, MediaItemList } from 'google-photos';
import { localStorage } from 'local-storage'
import { MediaItemLite } from 'photos-clock';
import { environment } from '../env';

const A_DAY_MS = 1000 * 60 * 60 * 24;

export class GoogleClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    public onAccessTokenUpdated: (token: string) => void;

    public login(accessToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    private async getAlbumsInternal(pageToken: string | null = null): Promise<AlbumList> {
        let url = "https://photoslibrary.googleapis.com/v1/albums?pageSize=50";

        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        const response = await this.fetchWithRefresh(url, {
            method: 'GET'
        });

        return await response.json()
    }

    private async fetchWithRefresh(url: string | Request, init?: RequestInit): Promise<Response> {
        let result = await fetch(url, {
            ...init,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        });
        if (result.status == 401 && this.refreshToken) {
            // Login!
            console.log("Refreshing token...");
            const body = `grant_type=refresh_token&refresh_token=${this.refreshToken}&client_id=${environment.clientId}&client_secret=${environment.clientSecret}`;
            const blob = new Blob([body], { type: 'application/x-www-form-urlencoded' });

            const authResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                // @ts-ignore
                body: blob
            });

            if (authResponse.ok) {
                this.accessToken = (await authResponse.json()).access_token;

                if (this.onAccessTokenUpdated) {
                    this.onAccessTokenUpdated(this.accessToken);
                }

                console.log("Token refreshed!");

                result = await fetch(url, {
                    ...init,
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            } else {
                throw "FAILED TO REFRESH TOKEN:  " + (await authResponse.text());
            }
        }

        if (!result.ok) {
            throw "REQUEST FAILED: " + (await result.text());
        }

        return result;
    }

    private async getMediaItemsInternal(albumId: string, pageToken: string | null = null): Promise<MediaItemList> {
        console.log("Fetching media items of album");
        const url = "https://photoslibrary.googleapis.com/v1/mediaItems:search";
        const body = {
            albumId,
            pageSize: 100,
            pageToken,
            // filters: {
            //     mediaTypeFilter: {
            //         mediaTypes: [ 'PHOTO' ]
            //     }
            // }   
        }

        const bodyBlob = new Blob([JSON.stringify(body)], { type: 'application/json' });

        // console.log("blob:" + bodyBlob);
        const response = await this.fetchWithRefresh(url, {
            method: 'POST',
            // @ts-ignore
            body: bodyBlob
        });

        return await response.json()
    }

    public async getAlbums(): Promise<Album[]> {
        const lastUpdate = localStorage.getItem('albums.time');
        const now = new Date().getTime()
        if (lastUpdate && (now - parseInt(lastUpdate) < A_DAY_MS)) {
            console.log("Using albums from cache");
            return JSON.parse(localStorage.getItem('albums')) as Album[];
        }

        const albums = [] as Album[];
        let page = await this.getAlbumsInternal();

        albums.push(...page.albums);

        while (page.nextPageToken) {
            console.log("Fetching page " + page.nextPageToken);
            page = await this.getAlbumsInternal(page.nextPageToken);

            albums.push(...page.albums)
        }

        localStorage.setItem('albums', JSON.stringify(albums));
        localStorage.setItem('albums.time', `${now}`);

        return albums;
    }

    public async getMediaItem(mediaItemId: String): Promise<MediaItem> {
        const result = await this.fetchWithRefresh(`https://photoslibrary.googleapis.com/v1/mediaItems/${mediaItemId}`, {});

        return await result.json() as MediaItem;
    }

    public async getMediaItems(album: Album): Promise<string[]> {
        const cachedCount = localStorage.getItem(`album.${album.id}.count`);
        // const cached = localStorage.getItem(`album.${album.id}`);
        if (cachedCount && cachedCount == album.mediaItemsCount) {
            const cachedIds = JSON.parse(localStorage.getItem(`album.${album.id}`));
            return cachedIds;
        }

        const mediaItems = [] as string[];
        let page = await this.getMediaItemsInternal(album.id);
        mediaItems.push(...page.mediaItems.filter(item => item.mediaMetadata.photo).map(item => item.id));

        while (page.nextPageToken) {
            page = await this.getMediaItemsInternal(album.id, page.nextPageToken);

            mediaItems.push(...page.mediaItems.filter(item => item.mediaMetadata.photo).map(item => item.id))
        }

        // Cache
        localStorage.setItem(`album.${album.id}`, JSON.stringify(mediaItems));
        localStorage.setItem(`album.${album.id}.count`, album.mediaItemsCount);

        return mediaItems;
    }

    public async download(id: string): Promise<ArrayBuffer> {
        // make sure we have an up-to-date link
        const mediaItem = await this.getMediaItem(id);

        // localStorage.setItem("")
        const response = await this.fetchWithRefresh(`${mediaItem.baseUrl}=w336-h336-c`)

        const arrayBuffer = await response.arrayBuffer()

        console.log(`Image size: ${arrayBuffer.byteLength / 1024}KB`)

        return arrayBuffer;
    }

}