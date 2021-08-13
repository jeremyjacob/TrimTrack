import { initializeApp } from 'firebase/app'
import {
    getFirestore,
    doc,
    collection,
    getDoc,
    updateDoc,
    setDoc,
} from 'firebase/firestore'

const firebaseConfig = {
    apiKey: 'AIzaSyA3hWWlGAG6kFufO3JquyFl9tpZFwdr-1E',
    authDomain: 'trim-track.firebaseapp.com',
    projectId: 'trim-track',
    storageBucket: 'trim-track.appspot.com',
    messagingSenderId: '218205615005',
    appId: '1:218205615005:web:86f65eb7dbfff68851f574',
}
export const app = initializeApp(firebaseConfig)
export const f = getFirestore(app)
export const usersCol = collection(f, 'users')

export type Token = {
    access: string
    refresh: string
}

export type Playlist = {
    [songID: string]: {
        start: number
        end: number
    }
}

const refreshToken = async (): Promise<string> =>
    new Promise((resolve, reject) =>
        chrome.storage.sync.get('spotifyRefresh', (res) =>
            resolve(res.spotifyRefresh)
        )
    )

export async function getSong(
    index: number,
    playlistID: string
): Promise<string> {
    console.log('getSong')
    const access = (await token()).access

    const json = await (
        await fetch('https://api.spotify.com/v1/playlists/' + playlistID, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + access,
            },
        })
    ).json()
    console.log(json)
    const { track } = json.tracks.items[index - 1]
    return track.id
}

export async function getPlaylist(playlistID: string) {
    console.log('getPlaylist')
    const refresh = await refreshToken()
    const playlistCol = collection(f, 'users', refresh, 'playlists')
    console.table({ user: refresh, playlistID })
    const ref = doc(f, 'users', refresh, 'playlists', playlistID)
    return (await getDoc(ref)).data() as Playlist
}



export async function updateTime(
    playlistID: string,
    songID: string,
    type: 'start' | 'end',
    value: number
) {
    console.log('updateTime')
    const refresh = await refreshToken()
    const ref = doc(f, 'users', refresh, 'playlists', playlistID)
    const data = { [`${songID}.${type}`]: value }

    try {
        await updateDoc(ref, data)
    } catch (error) {
        console.log('Creating Playlist Doc...')
        await setDoc(ref, { [songID]: { [type]: value } })
        await updateDoc(ref, data)
    }
}

export async function token() {
    console.log('token')
    const refresh = await refreshToken()
    const ref = doc(f, 'users', refresh)
    return (await getDoc(ref)).data()?.tokens as Token
}
