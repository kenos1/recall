export type Storage = {
        cards: Record<string, number>
}

export async function readStorage(path: string) {
        return Bun.file(path).json() as Promise<Storage>
}

export async function writeStorage(content: Storage, path: string) {
        Bun.file(path).write(JSON.stringify(content, null, 2))
}
