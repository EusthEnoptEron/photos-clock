import { Album } from 'google-photos';
import { settingsStorage } from "settings";

export enum FilterMode {
    Blacklist = 0,
    Whitelist = 1
}

export function getFilterMode(): FilterMode {
  const currentMode = JSON.parse(settingsStorage.getItem("behavior.mode"))?.selected[0] || 0;

  console.log("filter mode:", currentMode);
  if(currentMode === 0) {
    return FilterMode.Blacklist;
  } else {
    return FilterMode.Whitelist;
  }
}

function extractRegexes(entries: {name: string}[]): (RegExp|string)[] {
    return entries.map(e => {
        try {
            return new RegExp(e.name, "i")
        } catch {
            console.log("invalid regex: " + e.name);
            return e.name.toLowerCase();
        }
    });
}

function isMatch(input: string, term: RegExp | string) {
    if(term instanceof RegExp) {
        return term.test(input);
    }

    return input.toLowerCase().indexOf(term) >= 0;
}


function filterWithBlacklist(): (a: Album) => boolean {
    const items = JSON.parse(settingsStorage.getItem("behavior.album_blacklist")) || []
    const terms = extractRegexes(items);


    console.log("blacklist", settingsStorage.getItem("behavior.album_blacklist"));
    if(terms.length == 0) return a => true;

    // Accept if *no* (not some) terms match
    return (album) => !terms.some(term => isMatch(album.title, term))
}


function filterWithWhitelist(): (Album) => boolean {
    const items = JSON.parse(settingsStorage.getItem("behavior.album_whitelist")) || []
    const terms = extractRegexes(items);

    console.log("whitelsit", JSON.stringify(items));

    if(terms.length == 0) return a => false;

    // Accept if *any* (some) terms match
    return (album) => terms.some(term => isMatch(album.title, term))
}

export function getAlbumFilter(filterMode: FilterMode | null = null): (a: Album) => boolean {
    if(filterMode === null) {
        filterMode = getFilterMode();
    }

    switch(filterMode) {
        case FilterMode.Blacklist:
            return filterWithBlacklist();
        case FilterMode.Whitelist:
            return filterWithWhitelist();
        default:
            throw "Filter not implemented."
    }
    
}