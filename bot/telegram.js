import TelegramBot from "node-telegram-bot-api";
import Crash from "./module/crash.js";
import Double from "./module/double.js";
export default class Telegram {
    constructor() {
        this.bot = new TelegramBot("5761826356:AAFqxvwZ4cM1txODuVFDOhJu-e23SffInB8", { polling: true });
        new Double(this.bot)
        new Crash(this.bot)

    }
    
    
}