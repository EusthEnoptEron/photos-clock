import { MediaItemLite } from 'photos-clock'

export interface AppState {
    currentIndex: number | null,
    photos: PhotoInfo[]
}

export interface PhotoInfo {
    data: MediaItemLite | null,
    inProgress: Boolean
}