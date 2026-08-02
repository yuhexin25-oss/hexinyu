import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const STYLE_URL = 'https://demotiles.maplibre.org/style.json';

type MapNode = HTMLElement & { dataset: DOMStringMap & { config?: string; mapReady?: string; mapLoaded?: string } };

function readConfig(node: MapNode) {
  if (!node.dataset.config) throw new Error('Map configuration is missing.');
  return JSON.parse(decodeURIComponent(node.dataset.config));
}

function showFailure(node: MapNode, error: unknown) {
  console.error('Map failed to initialize:', error);
  node.classList.add('map-unavailable');
  node.closest('figure')?.querySelector<HTMLElement>('[data-map-fallback]')?.removeAttribute('hidden');
}

function prepareMap(node: MapNode, config: any, defaultCenter: [number, number], defaultZoom: number) {
  const map = new maplibregl.Map({
    container: node,
    style: STYLE_URL,
    center: config.center ?? defaultCenter,
    zoom: config.zoom ?? defaultZoom,
    attributionControl: true,
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  return map;
}

function pointCollection(points: any[]) {
  return {
    type: 'FeatureCollection' as const,
    features: points.map((point) => ({
      type: 'Feature' as const,
      properties: {
        label: point.label,
        detail: point.detail ?? '',
        color: point.color ?? '#d99a2b',
        size: point.size ?? 7,
      },
      geometry: { type: 'Point' as const, coordinates: [point.lon, point.lat] },
    })),
  };
}

function greatCircleSegment(start: [number, number], end: [number, number], steps = 48) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const toDegrees = (value: number) => value * 180 / Math.PI;
  const [startLon, startLat] = start.map(toRadians);
  const [endLon, endLat] = end.map(toRadians);
  const angularDistance = 2 * Math.asin(Math.sqrt(
    Math.sin((endLat - startLat) / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin((endLon - startLon) / 2) ** 2,
  ));

  if (angularDistance === 0) return [start];

  const coordinates: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps;
    const startWeight = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
    const endWeight = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);
    const x = startWeight * Math.cos(startLat) * Math.cos(startLon) + endWeight * Math.cos(endLat) * Math.cos(endLon);
    const y = startWeight * Math.cos(startLat) * Math.sin(startLon) + endWeight * Math.cos(endLat) * Math.sin(endLon);
    const z = startWeight * Math.sin(startLat) + endWeight * Math.sin(endLat);
    let longitude = toDegrees(Math.atan2(y, x));
    const latitude = toDegrees(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)));

    const previousLongitude = coordinates.at(-1)?.[0];
    if (previousLongitude !== undefined) {
      while (longitude - previousLongitude > 180) longitude -= 360;
      while (longitude - previousLongitude < -180) longitude += 360;
    }
    coordinates.push([longitude, latitude]);
  }
  return coordinates;
}

function geodesicCoordinates(coordinates: [number, number][]) {
  const interpolated = coordinates.slice(0, -1).flatMap((coordinate, index) => {
    const segment = greatCircleSegment(coordinate, coordinates[index + 1]);
    return index === 0 ? segment : segment.slice(1);
  });
  return interpolated.map(([rawLongitude, latitude], index) => {
    let longitude = rawLongitude;
    const previousLongitude = index > 0 ? interpolated[index - 1][0] : undefined;
    if (previousLongitude !== undefined) {
      while (longitude - previousLongitude > 180) longitude -= 360;
      while (longitude - previousLongitude < -180) longitude += 360;
      interpolated[index][0] = longitude;
    }
    return [longitude, latitude] as [number, number];
  });
}

function lineCollection(lines: any[]) {
  return {
    type: 'FeatureCollection' as const,
    features: lines.map((line) => ({
      type: 'Feature' as const,
      properties: { color: line.color ?? '#527ca8', width: line.width ?? 2 },
      geometry: {
        type: 'LineString' as const,
        coordinates: line.geodesic ? geodesicCoordinates(line.coordinates) : line.coordinates,
      },
    })),
  };
}

function addPoints(map: maplibregl.Map, points: any[], prefix: string) {
  const sourceId = `${prefix}-points`;
  map.addSource(sourceId, { type: 'geojson', data: pointCollection(points) });
  map.addLayer({
    id: sourceId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': ['get', 'size'],
      'circle-color': ['get', 'color'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  });
  map.addLayer({
    id: `${prefix}-labels`,
    type: 'symbol',
    source: sourceId,
    layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-offset': [0, 1.25], 'text-anchor': 'top' },
    paint: { 'text-color': '#172033', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
  });
  map.on('click', sourceId, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const properties = feature.properties ?? {};
    new maplibregl.Popup()
      .setLngLat(event.lngLat)
      .setText([properties.label, properties.detail].filter(Boolean).join('\n'))
      .addTo(map);
  });
  map.on('mouseenter', sourceId, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', sourceId, () => { map.getCanvas().style.cursor = ''; });
}

function addLines(map: maplibregl.Map, lines: any[], prefix: string) {
  if (!lines.length) return;
  const sourceId = `${prefix}-routes`;
  map.addSource(sourceId, { type: 'geojson', data: lineCollection(lines) });
  map.addLayer({
    id: sourceId,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': ['get', 'width'],
      'line-opacity': 0.72,
    },
  }, `${prefix}-points`);
}

function initialize(node: MapNode, build: (map: maplibregl.Map, config: any) => void, center: [number, number], zoom: number) {
  if (node.dataset.mapReady) return;
  node.dataset.mapReady = 'initializing';

  try {
    const config = readConfig(node);
    const map = prepareMap(node, config, center, zoom);
    let loaded = false;

    map.once('load', () => {
      try {
        build(map, config);
        if (config.bounds) map.fitBounds(config.bounds, { padding: 42, duration: 0 });
        loaded = true;
        node.dataset.mapLoaded = 'true';
        node.dataset.mapReady = 'true';
        node.classList.add('map-loaded');
        node.closest('figure')?.querySelector<HTMLElement>('[data-map-fallback]')?.setAttribute('hidden', '');
        requestAnimationFrame(() => map.resize());
      } catch (error) {
        showFailure(node, error);
      }
    });

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error ?? event);
      if (!loaded) showFailure(node, event.error ?? event);
    });
  } catch (error) {
    showFailure(node, error);
  }
}

export function initWorldCupMaps() {
  document.querySelectorAll<MapNode>('[data-world-cup-map]').forEach((node) => {
    initialize(node, (map, config) => {
      addPoints(map, config.points, node.id);
      addLines(map, config.lines ?? [], node.id);
    }, [-98, 38], 2.6);
  });
}

export function initFlowMaps() {
  document.querySelectorAll<MapNode>('[data-flow-map]').forEach((node) => {
    initialize(node, (map, config) => {
      addPoints(map, config.points, node.id);
      const lines = config.flows.map((flow: any) => ({
        coordinates: [[flow.from.lon, flow.from.lat], [flow.to.lon, flow.to.lat]],
        color: flow.color,
        width: flow.width,
      }));
      addLines(map, lines, node.id);
    }, [-55, 40], 1.5);
  });
}
