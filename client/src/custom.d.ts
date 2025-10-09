declare module '../../../leaflet-2.0.0-alpha.1/src/Leaflet' {
  const L: any;
  export default L;
}

declare module '../../../leaflet-2.0.0-alpha.1/src/Leaflet.js' {
  const L: any;
  export default L;
}

declare module '*leaflet-2.0.0-alpha.1/*' {
  const whatever: any;
  export default whatever;
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module 'firebase/app';
declare module 'firebase/analytics';
declare module 'firebase/database';
declare module '*.json';
