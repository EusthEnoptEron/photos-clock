
declare module 'photos-clock' {
    // export enum MessageType {
    //     MediaItem
    // }
    type MessageType = "GetPhoto"
    | "Error"
    | "PhotoReceived"

    interface Message {
        id: string,
        type: MessageType,
        data?: any
    }

    interface PhotoRequest {
        index: number
    }

    interface MediaItemLite {
        id: string,
        name: string,
        creationTime: string,
        albumName: string,
        filename: string
    }
}