import { parseArgs } from "util"
import { statSync, readdirSync, existsSync } from "node:fs"
import { renderHome } from "./home"
import { confidenceDelays, renderCardBack, renderCardFront, stripPath, submitCard } from "./card"
import css from "./style.css" with { type: "text" }
import { readStorage, writeStorage } from "./storage"

const args = parseArgs({
        args: Bun.argv,
        strict: true,
        options: {
                port: {
                        type: "string"
                },
        },
        allowPositionals: true
})

const port = args.values.port ?? process.env.PORT ?? "3000"

const path = args.positionals.at(-1)

if (!path)
        throw new Error("Cannot get a path from arguments list!")


if (!statSync(path).isDirectory())
        throw new Error(`Path ${path} is not a directory!`)

const contents = readdirSync(path, { recursive: true, encoding: "utf8" }).filter(p => p.endsWith(".md")).map(p => path + p)

console.log(`Hosting server at port ${port}`)

const storagePath = path + ".store"
if (!existsSync(storagePath)) {
        writeStorage({ cards: {} }, storagePath)
}
let storage = await readStorage(storagePath)

Bun.serve({
        port,
        routes: {
                "/": _req => {
                        return new Response(renderHome(contents, storage), {
                                headers: {
                                        "Content-Type": "text/html"
                                }
                        })
                },
                "/study/*": async req => {
                        const cardId = req.url.replace(/.*\/study\//gm, "")
                        const cardPath = contents.find(p => p.includes(cardId))

                        if (!cardPath) return new Response(null, {
                                status: 404
                        })

                        return new Response(await renderCardFront(cardPath), {
                                headers: {
                                        "Content-Type": "text/html"
                                }
                        })
                },
                "/answer/*": async req => {
                        const cardId = req.url.replace(/.*\/answer\//gm, "")
                        const cardPath = contents.find(p => p.includes(cardId))

                        if (!cardPath) return new Response(null, {
                                status: 404
                        })

                        return new Response(await renderCardBack(cardPath), {
                                headers: {
                                        "Content-Type": "text/html"
                                }
                        })
                },
                "/submit/:confidence/*": async req => {
                        const cardIdWithConfidence = req.url.replace(/.*\/submit\//gm, "")

                        const confidence = req.params.confidence

                        const cardId = cardIdWithConfidence.slice(confidence.length + 1)

                        submitCard(confidence, cardId, storage)
                        writeStorage(storage, storagePath)

                        const deckId = cardId.split("/").slice(0, -1).join("/")

                        console.log(deckId)

                        if (!deckId)
                                return Response.redirect("/")

                        const avaliableCards = contents.filter(p => p.includes(deckId) && (storage.cards[p] ?? 0) - Date.now() < 0)

                        console.log(avaliableCards)

                        if (avaliableCards.length === 0)
                                return Response.redirect("/")


                        return Response.redirect("/" + avaliableCards[0])
                },
                "/reload": async req => {
                        storage = await readStorage(storagePath)
                        return Response.redirect("/")
                },
                "/assets/*": async req => {
                        const assetDir = req.url.replace(/.*\/assets\//gm, "")

                        const assetFile = Bun.file(path + "assets/" + assetDir)

                        if (!(await assetFile.exists())) {
                                return new Response(null, { status: 404 })
                        }

                        return new Response(assetFile)
                },
                "/style.css": new Response(css)
        }
})
