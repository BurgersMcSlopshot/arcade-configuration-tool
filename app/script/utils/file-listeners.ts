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

export function subscribe(applicationName: string, filename: string, action: FileWatchAction) {
    if(fileWatches[filename] === undefined) {
        fileWatches[filename] = fs.watch(filename)
    }
    ensureFileListener(applicationName, filename, action);
}

export function unsubscribe(applicationName: string, filename: string) {
    if(applicationFileListeners[applicationName] && applicationFileListeners[applicationName][filename]) {
        removeApplicationFileListener(filename, applicationFileListeners[applicationName][filename]);
    } else {
        console.warn(`Cannot unsubscribe from ${applicationName}:${filename}: does not appear to have subscription.`);
    }
}

export function unsubscribeAll(applicationName: string) {
    removeApplicationFileListeners(applicationName)
} 