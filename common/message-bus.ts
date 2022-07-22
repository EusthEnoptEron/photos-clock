import { peerSocket } from 'messaging';
import { Message } from 'photos-clock';


// 1 minutes
const TIMEOUT_MS = 1 * 60 * 1000;

export class MessageBus {

    public onMessage: (message: Message) => void = function () { };

    private waitingList: ((success) => void)[] = [];
    private responseWaitingList: ({ id: string, time: number, callback: (message: Message | null) => void })[] = [];

    constructor(
        public dropOldMessages: boolean = false
    ) {
        peerSocket.addEventListener("open", () => this.onOpen())
        peerSocket.addEventListener("close", () => this.onClose());
        peerSocket.addEventListener("message", (msg) => {
            console.log("Received message");
            const message = msg.data as Message;
            this.onMessage(message);


            for (let i = 0; i < this.responseWaitingList.length; i++) {
                if (this.responseWaitingList[i].id === message?.id) {
                    const entry = this.responseWaitingList.splice(i--, 1)[0];
                    entry.callback(message);
                }
            }

            this.consumeTimeouts();
        });
    }

    private consumeTimeouts() {
        try {
            const now = new Date().getTime();
            for (let i = 0; i < this.responseWaitingList.length; i++) {
                if ((now - this.responseWaitingList[i].time) > TIMEOUT_MS) {
                    const entry = this.responseWaitingList.splice(i--, 1)[0];
                    entry.callback({
                        id: entry.id,
                        type: "Error",
                        data: "Timeout"
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    waitForResponse(id: string): Promise<Message> {
        return new Promise((resolve, reject) => {
            this.responseWaitingList.push({
                id,
                time: new Date().getTime(),
                callback: (response) => {
                    if (!response || response.type == 'Error') {
                        reject(response);
                        return;
                    }

                    resolve(response);
                }
            });
        });
    }

    private onOpen() {
        console.log("Connection opened! Processing...");
        let processed = 0;
        while (this.waitingList.length > 0 && peerSocket.readyState == peerSocket.OPEN) {
            if (this.dropOldMessages) {
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
                if (success) {
                    resolve(true);
                } else if (abortable) {
                    reject();
                } else if (this.isOpen) {
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
        this.consumeTimeouts();

        return new Promise(async (resolve, reject) => {
            try {
                if (peerSocket.readyState != peerSocket.OPEN) {
                    console.log("Not connected, waiting...")
                    await this.waitForConnection();
                }

                console.log("Send message");
                peerSocket.send(msg);
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    }
}