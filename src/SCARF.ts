import { Client, Message } from 'discord.js';

/**
 * The SCARF client.
 * @extends {Client}
 */
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

        /**
        * The prefix of the bot.
        * @type {string}
        */
        this.prefix = options.prefix || '?';

        /**
        * The token of the bot.
        * @type {string}
        */
        this.token = options.token;

        /**
        * Represents the tags provided by the user.
        * A tag may be represented by using the tag name (a string) as the key
        * and the content as the value, 
        * or with an object as the value.
        * The object should contain a required property `content`, 
        * representing the content of the command
        * and an optional property `aliases`
        * representing the alternative names of the tag.
        * @type {object}
        */
        this.tags = options.tags;

        /**
        * Whether or not the bot should handle edited messages.
        * @type {boolean}
        */
        this.handleEdits = !!options.handleEdits;

        /**
        * A Map linking the names and aliases of each tag with their respective contents.
        * @type {Map<string, string>}
        */
        this.commands = new Map();

        /**
        * A Map linking the user's command message with the reponse.
        * Used for handling edits.
        * @type {Map<string, string>}
        */
        this.correspondingMessages = new Map();
    }

    /**
     * Adds a tag to the commands Map.
     * Logs a warning if user attempts to register two tags or aliases with the same name.
     * @param {string} name - The name of the tag.
     * @param {string} content - The content of the tag.
     * @returns {void}
     */
    private registerTag(name: string, content: string): void {
        if (this.commands.has(name)) {
            return console.log(`[SCARF] [WARN] Duplicate tag name detected. Name of conflicting tag: ${name}`);
        }
        this.commands.set(name, content);
    }

    /**
     * Detects if a message should be replied to
     * and responds with the content of the corresponding tag.
     * Additionally, if the `handleEdits` property is true,
     * this will edit the message sent by the bot
     * to reflect the content of the new tag.
     * @param {Message} msg - The Message object passed by either the message or messageUpdate event.
     * @param {boolean} edited - Whether the message has been edited. Defaults to false.
     * @returns {Promise<Message | Message[] | void>}
     */
    async handleMessage(msg: Message, edited: boolean = false): Promise<Message | Message[] | void> {
        if (!msg.content.startsWith(this.prefix) || msg.author.bot) {
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


    /**
     * Attempts to connect to the API gateway,
     * registers all tags and their aliases into the `commands` Map,
     * and listens for message events to pass them to the `handleMessage` 
     * callback. Returns the token.
     * @returns {Promise<string>}
     */
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