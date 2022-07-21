
declare module 'photos-clock' {
    // export enum MessageType {
    //     MediaItem
    // }
    type MessageType = "MediaItem" | "Download" | "Refresh"

    interface Message {
        type: MessageType,
        data?: any
    }

    interface MediaItemLite {
        id: string,
        name: string,
        creationTime: string,
        albumName: string
    }
}