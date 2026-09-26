# Supabase setup

This site uses the Supabase project `hrhhbahxwbolhvhrbhjn` and reads content from
the JLPT tables and `manga_translations`.

The printable Thai guide with setup steps, existing data totals, and the full SQL
is [`Supabase-JLPT-Setup-TH.pdf`](./Supabase-JLPT-Setup-TH.pdf).

## Create the tables

1. Open the project's SQL Editor.
2. Run the contents of [`schema.sql`](./schema.sql) if the JLPT tables are
   not yet set up. If the vocabulary and kanji tables already exist, run only
   [`manga-schema.sql`](./manga-schema.sql) to add the manga translations table.
3. Export the vocabulary and kanji already bundled with the site by running
   `.\supabase\export-content-csv.ps1` from the project folder. The script
   writes CSV files under `supabase\import`.
4. Import `jlpt_vocabulary.csv` and `jlpt_kanji.csv` into their matching tables
   with the Supabase Table Editor. Expected columns:
   - `jlpt_vocabulary`: `level`, `word`, `reading`, `meaning`
   - `jlpt_kanji`: `level`, `character`, `readings_on`, `readings_kun`, `meaning`
   Keep `level` to `N5`, `N4`, `N3`, `N2`, or `N1`. Omit `id` and `created_at`
   during CSV import so PostgreSQL can assign them. The exported vocabulary
   removes exact duplicate level/word/reading rows, and meanings are in English;
   edit them in your CSV if Thai meanings are required.
5. The connected grammar pages read from `jlpt_grammar`. Confirm the current
   rows there and add any missing JLPT lessons; an empty template CSV is not
   source content.
6. `schema.sql` or `manga-schema.sql` creates the translation table and seeds
   the two translations currently present in
   `まんか読み.html`. Add more translation lines to `manga_translations` using
   the correct `series`, chapter, page, and line numbers.
7. No manga image upload is needed. Manga artwork continues to load from the
   local project image files; only text translations are read from Supabase.
8. Check the rows in `manga_translations` and test the translation modal.

## Set the browser key

In **Project Settings → API**, copy the project's publishable key (or legacy
`anon` key) into `publishableKey` in [`../data/supabase-client.js`](../data/supabase-client.js).
The project URL is already configured there.

The browser key is public by design. Never put the `service_role` key in HTML
or browser JavaScript. The schema enables row-level security and permits only
read access to the anonymous and authenticated roles.

## Data coverage

Creating the tables does not populate them. The vocabulary and kanji CSV
exporter prepares the larger local datasets. At the last live API check, the
database had 6 vocabulary, 10 kanji, and 8 grammar rows; these are not the
complete local JLPT datasets. The manga migration inserts the two translation
entries already in the local reader. Manga images are not stored in Supabase.

Manga series keys: `漫画読み.html` uses `manga-jp`, `まんか読み.html` uses
`manga-kana`, and `มังงะ.html` uses `manga-th`. The two pre-existing translation
entries belong to `manga-kana`, matching the 19-page `まんか読み.html` reader.
