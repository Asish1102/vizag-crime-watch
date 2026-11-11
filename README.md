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

Open `index.html` in a modern browser. An internet connection is needed for the Leaflet, SheetJS, font, and map-tile CDNs.

## Uploads

- **Coordinates:** `.xlsx`, `.xls`, or `.csv` with latitude and longitude fields. The map is generated automatically from these coordinates; no shapefile is required. The dashboard detects common names such as `Latitude`, `Lat`, `Longitude`, `Lon`, `Year`, `Crime`, and `Incident`.
- **GIS data:** select **Upload GIS data** to display descriptive case information from a separate GIS file.
- **RTI categories:** select **Upload RTI categories** to load a separate workbook whose worksheet names represent categories such as `THEFT`, `ROBBERY`, `DRUG CASES`, or `SEXUAL OFFENCES`. The offence analysis displays these categories as a pie chart with a case-count legend.

Hotspots are calculated client-side by grouping records into 0.01° grid cells. No uploaded data is sent to a server.
