import fs from 'fs';

export type FileWatchAction = (...args: any[]) => void;
type FileListenerSet = {[key: string]: FileWatchAction};

const start = new Date().getTime();

const fileWatches: {[key: string]: fs.FSWatcher} = {};

const applicationFileListeners: {[key: string]: FileListenerSet} = {};

function removeApplicationFileListener(fileName: string, listener: FileWatchAction): void {
    if(fileWatches[fileName]) {
        fileWatches[fileName].removeListener('change', listener);
    }
}

function removeApplicationFileListeners(applicationName: string) {
    if(applicationFileListeners[applicationName]) {
        Object
        .keys(applicationFileListeners[applicationName])
        .forEach(f=>removeApplicationFileListener(f, applicationFileListeners[applicationName][f]));
    }
}

function ensureApplicationFileListenerSet(applicationName: string): void {
    if(applicationFileListeners[applicationName] === undefined) {
        applicationFileListeners[applicationName] = {};
    }
}

function ensureFileListener(applicationName: string, fileName: string, action: FileWatchAction): void {
    ensureApplicationFileListenerSet(applicationName);
    if(applicationFileListeners[applicationName][fileName] !== undefined) {
        removeApplicationFileListener(fileName, applicationFileListeners[applicationName][fileName]);
    }
    applicationFileListeners[applicationName][fileName] = action;
}

export function subscribe(filename: string, applicationName: string, action: FileWatchAction) {
    if(fileWatches[filename] === undefined) {
        fileWatches[filename] = fs.watch(filename)
    }
    ensureFileListener(applicationName, filename, action);
}