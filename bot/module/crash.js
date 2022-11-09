import axios from "axios";
import { QuickDB } from "quick.db";

export default class Crash {

    hasSignal = false
    hasEmittedStatus = false
    chatID = "-1001865305809"
    history = []

    message = ""
    gale = 0
    after = null

    wins = 0
    losses = 0


    async crashesUpdate() {
        try {
            const req = await axios.get("https://blaze.com/api/crash_games/recent")
            const update = req.data
            
            if (this.history.length == 0 || update[0].id != this.history[0].id) {
                
                this.history = update
                this.findSignal()
                this.signalSync()
                this.db.push("crashCrashes", this.history[0])
            }
        } catch (ex) {
            this.crashesUpdate()
        }
    }
    

    async findSignal() {
        
        if (!this.hasSignal) {

            
            // C1
            if (this.history[0].crash_point < 2 && this.history[1].crash_point < 2 && this.history[2].crash_point < 2 && this.history[3].crash_point > 2) {
                this.signal("C1")
                return
            }
            // C2
            if (this.history[0].crash_point < 2 && this.history[1].crash_point < 2 && this.history[2].crash_point > 2 && this.history[3].crash_point < 2 && this.history[4].crash_point > 2) {
                this.signal("C2")
                return
            }
            // C3
            if (this.history[0].crash_point < 2 && this.history[1].crash_point > 2 && this.history[2].crash_point > 2 && this.history[3].crash_point > 2) {
                this.signal("C3")
                return
            }
        }

    }

    statusCheck() {
        let now = new Date()
        if (now.getMinutes() == 0) {
            if (!this.hasEmittedStatus) {
                this.bot.sendMessage(this.chatID, 
                    `📈 Status do bot: ✅ ${this.wins} vitórias e ❌ ${this.losses} derrotas. | ${((this.wins / (this.wins + this.losses)) * 100).toFixed(0)}% de assertividade.`)
            }
            this.hasEmittedStatus = true

        } else {
            this.hasEmittedStatus = false
        }
    }

    messageBase(status) {
        return `✈️  Entrada confirmado com auto retirar em 2.00x após o ${this.after.crash_point}x.\n\n${status}`
    }

    async resetSignal() {
        this.hasSignal = false
        this.gale = 0
        this.message = ""
    }

    async signal(strategy) {
        
        this.db.push("crashSignals", {
            target: 2.00,
            time: new Date(), 
            strategy: strategy,
            after: this.history[0]
        })
        this.after = this.history[0]
        this.hasSignal = true
        this.message = await this.bot.sendMessage(this.chatID, this.messageBase("🟡 Aguardando... 🟡"))
        this.message = this.message.message_id
        
        
        
    }

    async signalSync() {
        if (this.hasSignal && this.message != "") {
            
            if (this.gale >= 2 && this.history[0].crash_point < 2) {
                await this.bot.editMessageText(this.messageBase("🔴 DERROTA 🔴"), { chat_id: this.chatID, message_id: this.message })
                this.resetSignal()
                this.losses++
            } else if (this.history[0].crash_point > 2) {
                await this.bot.editMessageText(this.messageBase("🟢 VITÓRIA 🟢"), { chat_id: this.chatID, message_id: this.message })
                this.resetSignal()
                if (this.hasInputBySequence) {
                    this.hasLossBySequence = true
                } else {
                    this.hasLossBySequence = false
                }
                this.wins++
            }

            else if (this.gale < 2) {
                this.gale++
                await this.bot.editMessageText(
                   this.messageBase(`🟡 Faça o gale ${this.gale} 🟡`),
                    { chat_id: this.chatID, message_id: this.message })
            }
        }
    }

    async syncData() {
        
        if (!this.db.has("crashWins")) {
            this.db.set("crashWins", 0)
            this.wins = 0
        } else {
            this.wins = this.db.get("crashWins")
        }
        if (!this.db.has("crashLosses")) {
            this.db.set("crashLosses", 0)
            this.losses = 0
        } else {
            this.losses = await this.db.get("crashLosses")
        }
    }
    constructor(bot) {
        this.bot = bot;
        this.db = new QuickDB()
        this.syncData()
        setInterval(() => {
            this.statusCheck()
            this.crashesUpdate()
            this.db.set("crashWins", this.wins)
            this.db.set("crashLosses", this.losses)
        }, 1000)
    }
}