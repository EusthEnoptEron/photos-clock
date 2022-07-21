import {peerSocket} from 'messaging';
import { Message } from 'photos-clock';

export class MessageBus {

    public onMessage: (message: Message) => void;

    private waitingList: ((success) => void)[] = [];

    constructor(
        public dropOldMessages: boolean = false
    ) {
        peerSocket.addEventListener("open", () => this.onOpen())
        peerSocket.addEventListener("close", () => this.onClose());
        peerSocket.addEventListener("message", (msg) => {
            console.log("Received message");
            this.onMessage(msg.data as Message)
        });
    }

    private onOpen() {
        console.log("Connection opened! Processing...");
        let processed = 0;
        while(this.waitingList.length > 0 && peerSocket.readyState == peerSocket.OPEN) {
            if(this.dropOldMessages) {
                (this.waitingList.pop())(processed == 0);
            } else {
                (this.waitingList.shift())(true);
            }

            processed++;
        }
    }

    private onClose() {

    }

    public get isOpen() {
        return peerSocket.readyState == peerSocket.OPEN;
    }

    waitForConnection(abortable: boolean = true) {
        return new Promise((resolve, reject) => {
            this.waitingList.push(async success => {
                if(success) {
                    resolve(true);
                } else if(abortable) {
                    reject();
                } else if(this.isOpen) {
                    resolve(true);
                } else {
                    await new Promise(res2 => {
                        setTimeout(res2, 100);
                    });
                    await this.waitForConnection(abortable);
                    resolve(true);
                }
            });
        });
    }

    send(msg: Message): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                if(peerSocket.readyState != peerSocket.OPEN) {
                    console.log("Not connected, waiting...")
                    await this.waitForConnection();
                }

                console.log("Send message");
                peerSocket.send(msg);
                resolve(true);
            } catch(e) {
                reject(e);
            }
        });
    }
}