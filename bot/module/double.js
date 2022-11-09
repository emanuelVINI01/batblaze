import axios from "axios"
import { QuickDB } from "quick.db"

export default class Double {

    hasSignal = false
    hasEmittedStatus = false
    chatID = "-1001855935387"
    history = []


    message = ""
    targetColor = null
    after = null
    gale = 0
    hasLossBySequence = false
    hasInputBySequence = false


    wins = 0
    losses = 0

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

    colorToEmoji(color) {
        if (color == 1) {
            return "🔴"
        } else if (color == 2) {
            return "⚫"
        } else {
            return "⚪"
        }
    }

    messageBase(status) {
        return `🧬 Entrada confirmado no ${this.colorToEmoji(this.targetColor)}+${this.colorToEmoji(0)} após o ${this.after.roll} ${this.colorToEmoji(this.after.color)}.\n\n${status} `

    }

    revertColor(color) {
        if (color == 1) {
            return 2
        } else if (color == 2) {
            return 1
        } else {
            return 0
        }
    }


    async spinsUpdate() {
        try {
            const req = await axios.get("https://blaze.com/api/roulette_games/recent")
            const update = req.data
            console.log(update)
            if (this.history.length == 0 || update[0].id != this.history[0].id) {
                
                this.history = update
                this.findSignal()
                this.signalSync()
                this.db.push("doubleSpins", this.history[0])
            }
        } catch (ex) {
            this.spinsUpdate()
            console.log(ex)
        }
    }

    resetSignal() {
        this.targetColor = null
        this.hasSignal = false
        this.after = null
        this.gale = 0
    }

    async signal(target, strategy) {
        if (target == 0) {
            return
        }
        this.db.push("doubleSignals", {
            target: target,
            time: new Date(), 
            strategy: strategy,
            after: this.history[0]
        })
        this.targetColor = target
        this.after = this.history[0]
        this.hasSignal = true
        this.message = await this.bot.sendMessage(this.chatID, this.messageBase("🟡 Aguardando... 🟡"))
        this.message = this.message.message_id
        
        
    }
    async signalSync() {
        if (this.hasSignal && this.message ) {
            
            if (this.gale >= 2 && this.history[0].color != this.targetColor && this.history[0].color != 0) {
                await this.bot.editMessageText(this.messageBase("🔴 DERROTA 🔴"), { chat_id: this.chatID, message_id: this.message })
                this.resetSignal()
                this.losses++
            } else if (this.history[0].color == this.targetColor || this.history[0].color == 0) {
                await this.bot.editMessageText(this.messageBase(`🟢 VITÓRIA ${this.history[0].color == 0 ? "NO BRANCO " : ""}🟢`), { chat_id: this.chatID, message_id: this.message })
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
                    this.messageBase(`🟡 Faça o gale ${this.gale} 🟡`)
                    , { chat_id: this.chatID, message_id: this.message })

            }
        }
    }

    hasMore(target) {
        let targetGroup = this.history.filter((spin) => spin.color == target)
        let otherGroup = this.history.filter((spin) => spin.color != this.revertColor(target))
        return targetGroup.length > otherGroup
    }

    async findSignal() {
        if (!this.hasSignal) {
            
            //Entrada do Pós Branco (A1)
            
            if (this.history[2].color == 0 && this.history[1].color != 0 && this.history[0].color != 0 && 
                !this.hasMore(this.revertColor(this.history[0].color))) {
                this.hasInputBySequence = false

                this.signal(this.revertColor(this.history[0].color), "Entrada do Pós Branco (A1)")
                return
            }

            //Entrada do CooC (A2)
            if (this.history[3].color == this.history[0].color && this.history[1].color == this.history[2].color && 
                this.hasMore(this.revertColor(this.history[0].color))) {
                this.hasInputBySequence = false
                this.signal(this.revertColor(this.history[0].color), "Entrada do CooC (A2)")
                return
            }
            //Entrada Xadrez com verificação anti quebra (A3)
            if (this.history[0].color != this.history[1].color && this.history[1].color != this.history[2].color
                && this.history[3].color != this.history[2].color &&
                !this.hasMore(this.history[0].color)) {
                this.hasInputBySequence = false
                this.signal(this.revertColor(this.history[0].color), "Entrada Xadrez com verificação anti quebra (A3)")
                return
            }
            //Entrada contra tendência de cor (A4)
            if (this.history[0].color == this.history[1].color && this.history[0].color == this.history[2].color && this.history[0].color == this.history[3].color && this.history[0].color == this.history[4].color &&
                !this.hasLossBySequence && !this.hasMore(this.history[0].color)) {
                this.hasInputBySequence = true
                this.signal(this.revertColor(this.history[0].color), "Entrada contra tendência de cor (A4)")
                return
            }
        }
    }

    async syncData() {
        
        if (!this.db.has("doubleWins")) {
            this.db.set("doubleWins", 0)
            this.wins = 0
        } else {
            this.wins = await this.db.get("doubleWins")
        }
        if (!this.db.has("doubleLosses")) {
            this.db.set("doubleLosses", 0)
            this.losses = 0
        } else {
            this.losses = await this.db.get("doubleLosses")
        }
    }

    constructor(bot) {
        this.bot = bot;
        this.db = new QuickDB()
        this.syncData()
        setInterval(() => {
            this.statusCheck()
            this.spinsUpdate()
           
            this.db.set("doubleWins", this.wins)
            this.db.set("doubleLoss", this.losses)
        }, 1000)
    }
}
