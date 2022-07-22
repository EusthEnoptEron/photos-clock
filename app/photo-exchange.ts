import { MediaItemLite, PhotoRequest } from 'photos-clock';
import { MessageBus } from '../common/message-bus';

export class PhotoExchange {
    
    constructor(private messageBus: MessageBus) {
    }

    async getPhoto(index: number): Promise<MediaItemLite> {
        const id = Math.random().toString();

        await this.messageBus.send({
            id,
            type: 'GetPhoto',
            data: {
                index
            } as PhotoRequest
        });

        const response = await this.messageBus.waitForResponse(id);
        return response.data as MediaItemLite;
    }

    async acknowledgeReception(imageName: string) {
        this.messageBus.send({
            id: imageName,
            type: "PhotoReceived"
        });
    }
}