console.log('%cTrimTrack Loaded', 'color: green; font-size: x-large')
import { getPlaylist, Playlist, updateTime } from './firebase'
const numberReg = /^\d+$/

chrome.storage.sync.set({
    spotifyRefresh:
        'AQBjgPO7gFZskrh4rMTfoPiJ0Gy3oViDEw7xbuXjD4WhaQzYJM9dSMGrRRhrY-GUgrUMS0Xwu_0GxG6GBk7J99msPjxNeXpfZY7Fo_mnG1gJNrL3dyXSIvP8lgkv5Uk-wow',
})

let playlistSaved: Playlist
let playlistID: string
let url = location.href

async function checkURL() {
    if (location.href == url && playlistID) return
    url = location.href
    const start = 'https://open.spotify.com/playlist/'
    if (!url.startsWith(start)) return

    playlistID = url.split(start)[1].split('/')[0].split('?')[0]
    playlistSaved = await getPlaylist(playlistID)
}
checkURL()

function click(event: MouseEvent) {
    const target = event.target as HTMLElement
    target.contentEditable = 'true'
    target.focus()
    window.getSelection()?.selectAllChildren(target)
}

async function sha1(str: string) {
    const buf = await crypto.subtle.digest(
        'SHA-1',
        new TextEncoder().encode(str)
    )
    const hashArray = Array.from(new Uint8Array(buf))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex

}

function getID(row: HTMLElement) {
    const titleArtist = row.children[1].textContent
    if (!titleArtist) return
    return sha1(titleArtist)
}

async function finalize(event: Event) {
    const target = event.target as HTMLElement
    const row = target?.parentElement?.parentElement
    if (!row) return

    target.contentEditable = 'false'
    let time = target.innerHTML
    const length = time.split('.')[0].length
    if (length == 1) time = '0:0' + time
    else if (length == 3) time = '0:' + time.replace(':', '')
    target.innerHTML = time

    const type = target.classList.contains('start') ? 'start' : 'end'
    const split = target.innerHTML.split(':')
    const inputted = [parseInt(split[0]), parseFloat(split[1])]
    const value = (inputted[0] * 60 + inputted[1]) * 1000
    const id = await getID(row)
    // const index = parseInt(row?.firstChild?.textContent || '')
    if (!playlistID || !id) return

    console.table({ playlistID, id, type, value })
    updateTime(playlistID, id, type, value)
}

function keyPress(event: KeyboardEvent) {
    const target = event.target as HTMLElement
    event.stopPropagation()
    if (event.key == 'Enter') {
        event.preventDefault()
        target.blur()
    }

    if (event.key == ':' || event.key == 'Backspace' || event.key == '.') return
    if (!event.key.match(numberReg)) {
        event.preventDefault()
        return
    }

    if (target.innerHTML.length == 1) {
        document.execCommand('insertText', false, ':')
    }
}

const gridTemplate = [
    'grid-template-columns',
    '[index] 16px [first] 6fr [var1] 4fr [var2] 3fr [var3] 2fr [last] minmax(120px,1fr)',
]

function addLabel() {
    const row = document.querySelector('[role="row"]') as HTMLElement
    if (!row || row.children.length > 5) return
    row.style.setProperty(gridTemplate[0], gridTemplate[1])
    const labelDateAdded = row.children[3]

    const trimLabel = labelDateAdded.cloneNode(true) as HTMLElement | null
    if (trimLabel == null) return
    trimLabel.querySelector('div')?.style.setProperty('height', '35px')
    trimLabel.style.display = 'block'
    const span = trimLabel.querySelector('span')
    if (span) span.innerHTML = 'trim track'
    row.insertBefore(trimLabel, labelDateAdded.nextSibling)
}

function timestamp(ms: number) {
    const s = ms / 1000
    const min = Math.floor(s / 60)
    const sec = Math.floor(s - min * 60).toString()
    return `${min}:${sec.padStart(2, '0')}`
}

function addCol() {
    if (!playlistSaved) return
    const tracklistNodes = document.querySelectorAll(
        '[data-testid="tracklist-row"]'
    )

    tracklistNodes.forEach(async (_node) => {
        const node = _node as HTMLElement
        if (node.children.length > 5) return
        const durationCol = node.children[4]
        if (!durationCol) return
        node.style.setProperty(gridTemplate[0], gridTemplate[1])
        const divStyle = `
        cursor: pointer;
        outline: none;
        margin-right: 4px;
        font-family: 'Roboto Mono', monospace;
        font-size: 14px;
        `

        const hash = await getID(node)
        if (!hash) return
        const savedHash = playlistSaved[hash]

        const timeDiv = document.createElement('div')
        timeDiv.setAttribute('role', 'gridcell')
        timeDiv.setAttribute('tabindex', '-1')
        timeDiv.style.display = 'flex'
        timeDiv.style.alignItems = 'center'
        timeDiv.style.justifySelf = 'start'

        const startDiv = document.createElement('span')
        startDiv.innerHTML = savedHash?.start ? timestamp(savedHash.start) : '0:00'
        startDiv.setAttribute('style', divStyle + 'margin-right: 4px;')
        startDiv.addEventListener('keypress', keyPress, true)
        startDiv.onclick = click
        startDiv.onblur = finalize
        startDiv.onkeydown = keyPress
        startDiv.onkeyup = (e) => e.stopPropagation()
        startDiv.classList.add('trim', 'start', 'xih1EsUKc30BvZ2zKzAf')

        const dashElement = document.createElement('span')
        dashElement.setAttribute('style', 'margin-right: 4px;')
        dashElement.innerHTML = '-'

        const endDiv = document.createElement('span')
        endDiv.innerHTML = savedHash?.end ? timestamp(savedHash.end) : durationCol.textContent || ''
        endDiv.setAttribute('style', divStyle)
        endDiv.onblur = finalize
        endDiv.onclick = click
        endDiv.onkeydown = keyPress
        endDiv.onkeyup = (e) => e.stopPropagation()
        endDiv.classList.add('trim', 'end', 'xih1EsUKc30BvZ2zKzAf')

        timeDiv.appendChild(startDiv)
        timeDiv.appendChild(dashElement)
        timeDiv.appendChild(endDiv)
        durationCol.before(timeDiv)
    })
}
setInterval(addCol, 50)
setInterval(addLabel, 100)
setInterval(checkURL, 50)
