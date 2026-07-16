const express = require("express");
const dotenv = require("dotenv");
const pg = require("pg");

dotenv.config();
console.log(process.env.DB_CON_STRING);

const conString = process.env.DB_CON_STRING;

if (conString == undefined) {
    console.log("ERROR: environment variable DB_CON_STRING not set.");
    process.exit(1);
}

const dbConfig = {
    connectionString: conString,
    ssl: { rejectUnauthorized: false }
}

const dbPool = new pg.Pool(dbConfig);  //Verbindung mit DB

const fs = require("fs");
const csvparser = require("csv-parse/sync");

const fileContent = fs.readFileSync("import/products.csv", "utf8");

const records = csvparser.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
});

async function importProducts() {
    try {
        for (const row of records) {
            let dbResponse = await dbPool.query("INSERT INTO products (category, name, description, imageUri, priceCent) VALUES ($1, $2, $3, $4, $5)",
            [
                row.category,
                row.name,
                row.description,
                row.imageUri,
                row.priceCent
            ]);
        }
    } catch (err) {
    console.log(err);
    }
}
importProducts();