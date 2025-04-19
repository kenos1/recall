import { Temporal } from "@js-temporal/polyfill"
import { stripPath } from "./card"
import homeHTML from "./home.html" with { type: "text" }
import { type Storage } from "./storage"

export function renderHome(paths: string[], storage: Storage): string {
        return new HTMLRewriter().on("#flashcards-list", {
                element(element) {
                        element.setInnerContent(
                                paths
                                        .map((p) => {
                                                const when = storage.cards[p] ?? 0
                                                const duration = when - Date.now()
                                                console.log(duration, when)
                                                if (duration < 0) {
                                                        return `<li><a href="/study/${stripPath(p)}">${p}</a></li>`
                                                } else {
                                                        return `<li class="done">${p} (in ${new Temporal.Duration(0, 0, 0, 0, 0, 0, 0, duration)
                                                                                       .round({ largestUnit: "days", smallestUnit: "seconds" })
                                                                                       .toLocaleString()})</li>`
                                                }
                                        }).join(""), { html: true })
                }
        }).transform(homeHTML)
}
