# Vizag Crime Watch

Browser-only crime hotspot dashboard for Visakhapatnam.

## Vercel deployment

The project includes [vercel.json](./vercel.json) and a metadata schema at [database/schema.sql](./database/schema.sql) for a Vercel Postgres-backed deployment. The schema stores upload metadata only (filename, dataset type, record count, detected fields, summaries, and timestamp); the uploaded files and case text remain browser-local unless a future storage layer is added.

To deploy:

1. Import this folder into a Vercel project named `vizag-crime-watch`.
2. Add Vercel Postgres through the project's **Storage** tab.
3. Run `database/schema.sql` in the Postgres query editor.
4. Add a server-side API route using the Vercel Postgres connection variables to insert rows into `dataset_uploads`.

Do not expose database connection strings or privileged database credentials in `index.html` or `app.js`.

## Run it

Open `index.html` in a modern browser. An internet connection is needed for the Leaflet, SheetJS, shpjs, font, and map-tile CDNs.

## Uploads

- **Crime data:** `.xlsx`, `.xls`, or `.csv` with latitude and longitude fields. The dashboard automatically detects common names such as `Latitude`, `Lat`, `Longitude`, `Lon`, `Year`, `Crime`, and `Incident`. Select **Upload new dataset** at any time: the previous analysis is replaced, filters reset, and all KPIs, charts, hotspots, and markers are recalculated. The same file can be selected again after an upload.
- **Boundary layer:** upload a `.zip` containing the complete shapefile set: `.shp`, `.shx`, `.dbf`, and preferably `.prj`. The dashboard also accepts a standalone `.shp` for geometry-only boundary display.
- **GIS dataset:** select **Upload GIS dataset** to display descriptive case information separately from the map dataset. The panel summarizes records, police stations, crime types, coordinate availability, type distribution, and case rows.

Hotspots are calculated client-side by grouping records into 0.01° grid cells. No uploaded data is sent to a server.
