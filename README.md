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
- **GIS / RTI workbook:** select **Upload GIS / RTI workbook** to process all worksheets in one upload. Worksheets with latitude/longitude fields populate the hotspot map, worksheets with GIS headers populate the case-information table, and category worksheets such as `THEFT`, `ROBBERY`, `DRUG CASES`, or `SEXUAL OFFENCES` are counted separately using the worksheet name as the incident category. This supports RTI workbooks where the coordinate data, GIS datasheet, and incident-category reply are separate worksheets. For a single GIS sheet, categories still come from `Type and nature of the crime`; legal sections remain visible in the case table but are not used as offence categories.

Hotspots are calculated client-side by grouping records into 0.01° grid cells. No uploaded data is sent to a server.
