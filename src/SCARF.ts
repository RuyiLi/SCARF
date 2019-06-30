import { Client, Message } from 'discord.js';

export class SCARF extends Client {
    public prefix: string;
    public token: string;
    public tags: object;
    private commands: Map<string, string>;
    private correspondingMessages: Map<string, string>;
    private handleEdits: boolean;

    constructor(options: {
        prefix: string,
        token: string,
        tags: object,
        handleEdits?: boolean,
    }, clientOptions: object = {}) {
        super(clientOptions);

        this.prefix = options.prefix || '?';
        this.token = options.token;
        this.tags = options.tags;
        this.handleEdits = !!options.handleEdits;
        this.commands = new Map();
        this.correspondingMessages = new Map();
    }

    registerTag(name: string, content: string): void {
        if (this.commands.has(name)) {
            return console.log(`[SCARF] [WARN] Duplicate tag name detected. Name of conflicting tag: ${name}`);
        }
        this.commands.set(name, content);
    }

    async handleMessage(msg: Message, edited: boolean = false): Promise<Message | Message[] | void> {
        if (!msg.content.startsWith(this.prefix)) {
            return;
        }
        const tag = msg.content.toLowerCase().slice(this.prefix.length);
        if (this.commands.has(tag)) {
            const content = this.commands.get(tag);
            if (!edited) {
                const m = await msg.channel.send(content);
                this.correspondingMessages.set(msg.id, (<Message> m).id);
            } else {
                const m = await msg.channel.fetchMessage(<string> this.correspondingMessages.get(msg.id));
                await m.edit(content);
            }
        }
    }

    async setup(): Promise<string> {
        try {
            await super.login(this.token);
        } catch (err) {
            throw err;
        }

        for (const tag of Object.entries(this.tags)) {
            const [name, data]: [string, string | { // eslint-disable-line
                aliases?: string[],
                content: string,
            }] = tag;   // eslint-disable-line

            if (typeof data === 'string') {
                this.registerTag(name, data);
            } else {
                if (typeof data.content === 'undefined') {
                    throw new Error(`[SCARF] [ERR] Missing required field \`content\` on command \`${name}\`.`);
                }
                this.registerTag(name, data.content);

                if (typeof data.aliases !== 'undefined') {
                    if (!(data.aliases instanceof Array) || typeof data.aliases[0] !== 'string') {
                        throw new Error(`[SCARF] [ERR] Field \`aliases\` should be an array of strings on command \`${name}\`.`);
                    }

                    for (const alias of data.aliases) {
                        this.registerTag(alias, data.content);
                    }
                }
            }
        }

        this.on('message', this.handleMessage);

        if (this.handleEdits) {
            this.on('messageUpdate', (_: Message, msg: Message) => this.handleMessage(msg, true));
        }

        return this.token;
    }
}