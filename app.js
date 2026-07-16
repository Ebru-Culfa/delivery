const express = require("express");
const dotenv = require("dotenv");
const pg = require("pg");
const session = require("express-session");
const res = require("express/lib/response");

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

const dbPool = new pg.Pool(dbConfig);

/* Reading global variables from config file */

const PORT = process.env.PORT || 3000;

const app = express();

//turn on serving static files (required for delivering css to client)
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "This is a secret!",
    cookie: { maxAge: 3600000 },
    resave: false,
    saveUninitialized: false
}));

//configure template engine
app.set("views", "views");
app.set("view engine", "hbs");

app.get("/", (req, res) => {
    res.render("home", {
        user: req.session.user
    });
})

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/einloggen");}
}

app.get("/produkte", isAuthenticated, async function (req, res) {
    try {
        let category = req.query.category;
        let dbResponse = await dbPool.query("SELECT * FROM products WHERE category=$1", [category]);
        console.log(dbResponse.rows);

        for(const product of dbResponse.rows) {
            product.priceEuro = centToEuro(product.pricecent);
            console.log(product.priceEuro);
        }
        let viewData = {
            title: "Produkt auswählen",
            products: dbResponse.rows,
            category: category,
            user: req.session.user,
        };
        res.render("speisekarte", viewData);

    } catch (err) {
        console.log(err);
    }
});

function centToEuro(pricecent) {
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).
    format(pricecent / 100);
}

app.get("/einloggen", function(req, res) {
    res.render("einloggen");
});

app.post("/einloggen", async function(req, res) {
    let email = req.body.email;
    let password = req.body.password;

    let dbResponse = await dbPool.query(
        "SELECT * FROM users WHERE email=$1 AND password=$2",
        [email, password]
    );

    if (dbResponse.rows.length === 0) {
        res.render("einloggen", { login_error: "Email und Passwort stimmen nicht überein!" });
    } else {
        req.session.user = {
            name: dbResponse.rows[0].name,
            surname: dbResponse.rows[0].surname,
            email: dbResponse.rows[0].email,
        }
        res.redirect("/");
    }
    console.log(req.body.email);
    console.log(req.body.password);
});

app.get("/registrieren", function(req, res) {
    res.render("registrieren");
});

app.post("/registrieren", async function(req, res) {
    let name = req.body.name;
    let surname = req.body.surname;
    let email = req.body.email;
    let password = req.body.password;
    try {
        let dbResponse = await dbPool.query("INSERT INTO users (name, surname, email, password) VALUES ($1, $2, $3, $4)", [name, surname, email, password]);
        let viewData = {
            title: "Registrierung erfolgreich",
        };
        res.redirect("/");

        console.log(req.body.name);
        console.log(req.body.surname);
        console.log(req.body.email);
        console.log(req.body.password);

    } catch (err) {
        console.log(err);
        let viewData = {
            title: "Registrierung fehlgeschlagen",
            error: err,
        };
    }
});

app.get("/ausloggen", function(req, res) {
    req.session.destroy(function (err) {
        console.log("Session destroyed.");
    })
    res.render("ausloggen");
});

app.listen(PORT, function() {
  console.log(`Delivery running and listening on port ${PORT}`);
});
