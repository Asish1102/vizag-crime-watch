/* global XLSX, L, shp */
(() => {
  const state = { records: [], filtered: [], hotspots: [], map: null, markers: null, boundary: null, source: '', gis: [] };
  const $ = (id) => document.getElementById(id);
  const els = { total: $('total-incidents'), cells: $('hotspot-cells'), peak: $('peak-cell'), coverage: $('coverage'), status: $('record-status'), source: $('data-source'), sourceName: $('source-name'), sourceTime: $('source-time'), year: $('year-filter'), view: $('severity-filter'), chart: $('year-chart'), table: $('hotspot-table'), empty: $('map-empty'), notice: $('notice'), crimeFile: $('crime-file'), gisFile: $('gis-file'), gisPanel: $('gis-panel') };
  const format = (n) => Number(n).toLocaleString('en-IN');

  function findColumn(headers, candidates) {
    const normalized = headers.map((h) => String(h ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const index = candidates.reduce((found, candidate) => found > -1 ? found : normalized.findIndex((h) => h.includes(candidate)), -1);
    return index;
  }
  function parseRows(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map((h, i) => String(h || `field_${i + 1}`).trim());
    const latIndex = findColumn(headers, ['latitude', 'lat']);
    const lonIndex = findColumn(headers, ['longitude', 'lon', 'lng']);
    const yearIndex = findColumn(headers, ['year', 'date', 'yearof']);
    const typeIndex = findColumn(headers, ['crime', 'offence', 'incident', 'section', 'type']);
    if (latIndex < 0 || lonIndex < 0) return [];
    return rows.slice(1).map((row, i) => {
      const lat = Number(row[latIndex]); const lon = Number(row[lonIndex]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
      const rawYear = row[yearIndex > -1 ? yearIndex : -1];
      const yearMatch = String(rawYear ?? '').match(/\b(19|20)\d{2}\b/);
      return { id: i, lat, lon, year: yearMatch ? yearMatch[0] : 'Unknown', type: typeIndex > -1 ? String(row[typeIndex] || 'Incident') : 'Incident' };
    }).filter(Boolean);
  }
  function gridKey(record) { return `${Math.floor(record.lat * 100) / 100}|${Math.floor(record.lon * 100) / 100}`; }
  function calculateHotspots(records) {
    const groups = new Map();
    records.forEach((record) => { const key = gridKey(record); const old = groups.get(key) || { key, lat: Math.floor(record.lat * 100) / 100 + .005, lon: Math.floor(record.lon * 100) / 100 + .005, count: 0 }; old.count += 1; groups.set(key, old); });
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }
  function populateYears() {
    const years = [...new Set(state.records.map((r) => r.year).filter((y) => y !== 'Unknown'))].sort();
    els.year.innerHTML = '<option value="all">All years</option>' + years.map((y) => `<option value="${y}">${y}</option>`).join('');
  }
  function renderGIS(rows, fileName) {
    const headers = rows[0].map((h) => String(h || '').trim());
    const value = (row, candidates) => { const i = findColumn(headers, candidates); return i > -1 ? String(row[i] ?? '').trim() : ''; };
    const records = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== '')).map((row) => ({ fir: value(row, ['firnumber', 'fir']), station: value(row, ['nameofps', 'policestation', 'station']), section: value(row, ['sectionoflaw', 'section']) || 'Not specified', type: value(row, ['typeandnature', 'crime', 'type']) || 'Not specified', location: value(row, ['locationofoccurrence', 'location']), coordinates: value(row, ['latitudeandlongitude', 'coordinates']) }));
    state.gis = records; els.gisPanel.classList.remove('hidden'); $('gis-file-name').textContent = fileName.toUpperCase(); $('gis-records').textContent = format(records.length); $('gis-stations').textContent = new Set(records.map((r) => r.station).filter(Boolean)).size; $('gis-types').textContent = new Set(records.map((r) => r.type).filter(Boolean)).size; $('gis-coordinates').textContent = `${records.filter((r) => r.coordinates && !/not available|na|n\/a/i.test(r.coordinates)).length} / ${records.length}`;
    const types = [...records.reduce((map, r) => map.set(r.type, (map.get(r.type) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 6); const max = types[0]?.[1] || 1; $('gis-types-list').innerHTML = types.map(([type, count]) => `<div class="type-row"><label><span>${type}</span><b>${count}</b></label><i><b style="width:${count / max * 100}%"></b></i></div>`).join('');
    const offences = [...records.reduce((map, r) => map.set(r.section, (map.get(r.section) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]); const offenceMax = offences[0]?.[1] || 1; $('offence-list').innerHTML = offences.map(([category, count], index) => `<div class="offence-row"><span class="offence-rank">${String(index + 1).padStart(2, '0')}</span><div class="offence-main"><div class="offence-label"><strong>${category}</strong><span>${format(count)} cases · ${(count / records.length * 100).toFixed(1)}%</span></div><div class="offence-track"><i style="width:${count / offenceMax * 100}%"></i></div></div></div>`).join('') || '<div class="table-empty">No offence categories found.</div>';
    $('gis-table').innerHTML = records.slice(0, 8).map((r) => `<tr><td>${r.fir || '—'}</td><td>${r.station || '—'}</td><td>${r.section || '—'}</td><td>${r.type}</td><td>${r.location || '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="table-empty">No case records found.</td></tr>';
  }
  function renderChart(records) {
    const counts = {}; records.forEach((r) => { counts[r.year] = (counts[r.year] || 0) + 1; });
    const years = Object.keys(counts).sort(); $('year-count').textContent = years.length ? `${years.length} YEARS` : '—';
    if (!years.length) { els.chart.innerHTML = '<div class="chart-empty">No year field detected in the uploaded records</div>'; return; }
    const max = Math.max(...years.map((y) => counts[y]));
    els.chart.innerHTML = years.map((year) => `<div class="bar" style="height:${Math.max(4, counts[year] / max * 88)}%"><em>${format(counts[year])}</em><span>${year === 'Unknown' ? '?' : year.slice(-2)}</span></div>`).join('');
  }
  function renderTable(hotspots, total) {
    els.table.innerHTML = hotspots.slice(0, 6).map((h, i) => `<tr><td class="rank">0${i + 1}</td><td>${h.lat.toFixed(3)}° N, ${h.lon.toFixed(3)}° E</td><td>${format(h.count)}</td><td><span class="share-track"><i style="width:${Math.max(5, h.count / hotspots[0].count * 100)}%"></i></span>${(h.count / total * 100).toFixed(1)}%</td></tr>`).join('') || '<tr><td colspan="4" class="table-empty">No matching records.</td></tr>';
  }
  function icon(className, size) { return L.divIcon({ className: '', html: `<div class="${className}" style="width:${size}px;height:${size}px"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }); }
  function renderMap(records, hotspots) {
    if (!state.map) { state.map = L.map('map', { zoomControl: false }).setView([17.735, 83.3], 11); L.control.zoom({ position: 'bottomright' }).addTo(state.map); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(state.map); state.markers = L.layerGroup().addTo(state.map); }
    state.markers.clearLayers();
    const visible = records.slice(0, 1200); visible.forEach((r) => L.marker([r.lat, r.lon], { icon: icon('incident-marker', 8) }).bindPopup(`<strong>${r.type}</strong><br>${r.year}<br>${r.lat.toFixed(5)}, ${r.lon.toFixed(5)}`).addTo(state.markers));
    hotspots.slice(0, 30).forEach((h) => L.marker([h.lat, h.lon], { icon: icon('hotspot-marker', Math.min(24, 10 + h.count * 1.5)) }).bindTooltip(`${h.count} incidents`, { direction: 'top' }).addTo(state.markers));
    if (visible.length) { state.map.fitBounds(L.latLngBounds(visible.map((r) => [r.lat, r.lon])), { padding: [25, 25], maxZoom: 13 }); els.empty.classList.add('hidden'); }
  }
  function ensureMap() { if (!state.map) renderMap([], []); }
  function render() {
    const year = els.year.value; let records = state.records.filter((r) => year === 'all' || r.year === year);
    if (els.view.value === 'hotspots') { const keys = new Set(calculateHotspots(records).filter((h) => h.count > 1).map((h) => h.key)); records = records.filter((r) => keys.has(gridKey(r))); }
    state.filtered = records; state.hotspots = calculateHotspots(records); const peak = state.hotspots[0]?.count || 0;
    els.total.textContent = format(records.length); els.cells.textContent = format(state.hotspots.filter((h) => h.count > 1).length); els.peak.textContent = format(peak); els.coverage.textContent = state.records.length ? `${Math.round(records.length / state.records.length * 100)}%` : '—'; els.status.textContent = year === 'all' ? 'All loaded records' : `Filtered to ${year}`; els.source.querySelector('.status-dot').classList.add('ready'); els.sourceName.textContent = state.source || 'Uploaded dataset';
    renderChart(records); renderTable(state.hotspots, records.length || 1); renderMap(records, state.hotspots);
  }
  async function loadWorkbook(file) {
    const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array', cellDates: true }); let rows = [];
    workbook.SheetNames.forEach((name) => { const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }); if (sheet.length > rows.length) rows = sheet; });
    const records = parseRows(rows);
    if (!records.length) { els.notice.querySelector('strong').textContent = 'Coordinates not detected'; els.notice.querySelector('p').textContent = 'Please use a workbook with latitude and longitude columns. No records were loaded.'; els.notice.style.background = '#fff2ee'; return; }
    state.records = records; state.source = file.name; els.year.value = 'all'; els.view.value = 'all'; els.sourceTime.textContent = `Updated ${new Date().toLocaleString()}`; populateYears(); render(); els.notice.querySelector('strong').textContent = `${format(records.length)} coordinate records loaded`; els.notice.querySelector('p').textContent = 'Previous analysis replaced. Filters, hotspot grid, map, and charts were recalculated from this upload.'; els.notice.style.background = '#edf8fa'; els.crimeFile.value = '';
  }
  async function loadGISWorkbook(file) {
    const buffer = await file.arrayBuffer(); const workbook = XLSX.read(buffer, { type: 'array', cellDates: true }); let rows = [];
    workbook.SheetNames.forEach((name) => { const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }); if (sheet.length > rows.length) rows = sheet; });
    if (!rows.length) { els.notice.querySelector('strong').textContent = 'GIS dataset is empty'; els.notice.querySelector('p').textContent = 'No case information was found in the uploaded file.'; return; }
    renderGIS(rows, file.name); els.notice.querySelector('strong').textContent = 'GIS case information updated'; els.notice.querySelector('p').textContent = 'The descriptive case panel was refreshed from the latest GIS dataset upload.'; els.notice.style.background = '#edf8fa'; els.gisFile.value = '';
  }
  async function loadBoundary(file) {
    try { ensureMap(); const buffer = await file.arrayBuffer(); let geojson; if (file.name.toLowerCase().endsWith('.shp') && typeof shp.parseShp === 'function') { const geometries = shp.parseShp(buffer); geojson = { type: 'FeatureCollection', features: geometries.map((geometry) => ({ type: 'Feature', properties: {}, geometry })) }; } else { geojson = await shp(buffer); } if (state.boundary) state.map.removeLayer(state.boundary); state.boundary = L.geoJSON(geojson, { style: { color: '#19aab8', weight: 1.5, fillColor: '#19c7d7', fillOpacity: .08 } }).addTo(state.map); state.map.fitBounds(state.boundary.getBounds(), { padding: [20, 20] }); els.notice.querySelector('strong').textContent = 'Boundary layer added'; els.notice.querySelector('p').textContent = 'Subdistrict boundaries are now visible on the map.'; } catch (error) { els.notice.querySelector('strong').textContent = 'Boundary could not be loaded'; els.notice.querySelector('p').textContent = 'For best results upload a ZIP containing .shp, .shx, .dbf, and .prj files.'; console.error(error); }
  }
  $('crime-file').addEventListener('change', (e) => e.target.files[0] && loadWorkbook(e.target.files[0]).catch(console.error));
  $('gis-file').addEventListener('change', (e) => e.target.files[0] && loadGISWorkbook(e.target.files[0]).catch(console.error));
  $('shape-file').addEventListener('change', (e) => e.target.files[0] && loadBoundary(e.target.files[0]));
  els.year.addEventListener('change', render); els.view.addEventListener('change', render); $('dismiss-notice').addEventListener('click', () => els.notice.remove());
  $('clear-data').addEventListener('click', () => { state.records = []; state.filtered = []; state.hotspots = []; state.source = ''; state.gis = []; els.year.innerHTML = '<option value="all">All years</option>'; els.year.value = 'all'; els.view.value = 'all'; els.total.textContent = '—'; els.cells.textContent = '—'; els.peak.textContent = '—'; els.coverage.textContent = '—'; els.status.textContent = 'Upload data to begin'; els.sourceName.textContent = 'No file loaded'; els.sourceTime.textContent = ''; els.source.querySelector('.status-dot').classList.remove('ready'); els.chart.innerHTML = '<div class="chart-empty">Upload data to see year distribution</div>'; els.table.innerHTML = '<tr><td colspan="4" class="table-empty">Upload coordinates to calculate hotspots.</td></tr>'; els.gisPanel.classList.add('hidden'); if (state.markers) state.markers.clearLayers(); els.empty.classList.remove('hidden'); els.crimeFile.value = ''; els.gisFile.value = ''; });
  window.addEventListener('resize', () => state.map && state.map.invalidateSize());
})();
