import { marked } from "./markdown"
import cardHTML from "./card.html" with { type: "text" }
import { type Storage } from "./storage"
import { Temporal } from "@js-temporal/polyfill"

export const confidenceDelays = {
        perfect: new Temporal.Duration(0, 0, 0, 7).total("milliseconds"),
        good: new Temporal.Duration(0, 0, 0, 1).total("milliseconds"),
        okay: new Temporal.Duration(0, 0, 0, 0, 6).total("milliseconds"),
        bad: new Temporal.Duration(0, 0, 0, 0, 0, 0, 30).total("milliseconds")
} satisfies Record<string, number>

const backRegexes = {
        begin: /#backstart/gm,
        end: /#backend/gm,
        section: /#backstart(.|\s)*#backend/gm
}

export function stripPath(path: string) {
        return path.split(".").slice(0, -1).join(".")
}

export async function renderCardFront(path: string) {
        const content = await Bun.file(path).text()
        const frontContent = content.replaceAll(backRegexes.section, "")
        return new HTMLRewriter().on("#content", {
                element(element) {
                        element.setInnerContent(marked.parse(frontContent), { html: true })
                }
        }).on("#answer-buttons", {
                element(element) {
                        element.remove()
                }
        }).on("#open-answer", {
                element(element) {
                        element.setAttribute("href", "/answer/" + stripPath(path))
                }
        }).on("#title", {
                element(element) {
                        element.setInnerContent(`Front of ${path}`)
                }
        }).transform(cardHTML) as unknown as string
}

export async function renderCardBack(path: string) {
        const content = await Bun.file(path).text()
        const backContent = content.replaceAll(backRegexes.begin, "").replaceAll(backRegexes.end, "")
        return new HTMLRewriter().on("#content", {
            element(element) {
                element.setInnerContent(marked.parse(backContent), { html: true })
            }
        }).on("#open-answer", {
                element(element) {
                        element.remove()
                }
        }).on("#answer-buttons a", {
                element(element) {
                        const id = element.getAttribute("id")
                        if (!id) throw new Error("HTML Template needs ID for answer buttons")

                        const confidence = id.slice("answer-".length)

                        element.setAttribute("href", "/submit/" + confidence + "/" + path)
                }
        }).on("#title", {
                element(element) {
                        element.setInnerContent(`Back of ${path}`)
                }
        }).transform(cardHTML) as unknown as string
}

export async function submitCard(confidence: string, path: string, storage: Storage) {
        const delay = confidenceDelays[confidence]
        if (!delay) throw new Error(`Confidence delay ${confidence} does not exist!`)
        storage.cards[path] = Date.now() + delay
}
