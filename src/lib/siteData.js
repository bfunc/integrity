import sites from '../data-sources/sources.json';

export const siteMap   = Object.fromEntries(sites.map(s => [s.id, s.name]));
export const regionMap = Object.fromEntries(sites.map(s => [s.id, s.region]));
export { sites };
