import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
const port = process.env.PORT || 3456;
const dbName = process.env.DB || "database.db";

const db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error("Failed to connect to the database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

const queryDatabase = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Database error:", err.message);
        reject(new Error(err.message));
      } else {
        resolve(rows);
      }
    });
  });
};

app.get("/data/:table", async (req, res) => {
  const tableName = req.params.table;
  try {
    const rows = await queryDatabase(`SELECT * FROM "${tableName}"`);
    res.json(rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/register", async (req, res) => {
  const { username, password, email, name } = req.body;
  if (!username || !password || !email || !name) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await queryDatabase(
      "INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, email, name]
    );
    res.status(201).json({
      success: true,
      message: "User registered successfully.",
    });
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({
        success: false,
        message: "Username or email already exists.",
      });
    } else {
      console.error("Error during registration:", err.message);
      res.status(500).json({
        success: false,
        message: "Failed to register user.",
      });
    }
  }
});

app.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields.",
    });
  }

  try {
    const users = await queryDatabase(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      res.status(200).json({
        success: true,
        message: "Login successful.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }
  } catch (err) {
    console.error("Error during login:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to log in.",
    });
  }
});

const getSortedColumnValues = async (tableName, columnName) => {
  try {
    const rows = await queryDatabase(`SELECT * FROM ${tableName}`);
    return rows.map((row) => row[columnName]).sort();
  } catch (err) {
    throw new Error(err.message);
  }
};

app.get("/categories", async (req, res) => {
  try {
    const categories = await getSortedColumnValues("kategorije", "ime");
    res.json(categories);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories.",
      error: err.message,
    });
  }
});

app.get("/eventTypes", async (req, res) => {
  try {
    const eventTypes = await getSortedColumnValues("tipovi_dogadaja", "ime");
    res.json(eventTypes);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve event types.",
      error: err.message,
    });
  }
});

app.get("/organizers", async (req, res) => {
  try {
    const organizers = await getSortedColumnValues("organizatori", "ime");
    res.json(organizers);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve organizers.",
      error: err.message,
    });
  }
});

app.get("/ageGroups", async (req, res) => {
  try {
    const ageGroups = await getSortedColumnValues("dobne_skupine", "ime");
    res.json(ageGroups);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve age groups.",
      error: err.message,
    });
  }
});

app.get("/columnValues", async (req, res) => {
  const tableNames = [
    "kategorije",
    "tipovi_dogadaja",
    "organizatori",
    "dobne_skupine",
  ];

  try {
    const results = await Promise.all(
      tableNames.map((tableName) => getSortedColumnValues(tableName, "ime"))
    );

    res.json({
      categories: results[0],
      event_types: results[1],
      organizers: results[2],
      age_groups: results[3],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve filter names.",
      error: err.message,
    });
  }
});

const buildEventSearchQuery = (
  categories,
  eventTypes,
  organizers,
  ageGroups
) => {
  let query = `
      SELECT e.*
      FROM eventi e
    `;

  let whereClauseAdded = false;

  if (categories && categories.length > 0) {
    const categoriesList = categories
      .map((cat) => `'${cat.replace("'", "''")}'`)
      .join(", ");
    query += ` ${
      whereClauseAdded ? "AND" : "WHERE"
    } e.kategorija IN (${categoriesList})`;
    whereClauseAdded = true;
  }

  if (eventTypes && eventTypes.length > 0) {
    const eventTypesList = eventTypes
      .map((type) => `'${type.replace("'", "''")}'`)
      .join(", ");
    query += ` ${
      whereClauseAdded ? "AND" : "WHERE"
    } e.tip IN (${eventTypesList})`;
    whereClauseAdded = true;
  }

  if (organizers && organizers.length > 0) {
    const organizersList = organizers
      .map((org) => `'${org.replace("'", "''")}'`)
      .join(", ");
    query += ` ${
      whereClauseAdded ? "AND" : "WHERE"
    } e.organizator IN (${organizersList})`;
    whereClauseAdded = true;
  }

  if (ageGroups && ageGroups.length > 0) {
    const ageGroupsList = ageGroups
      .map((group) => `'${group.replace("'", "''")}'`)
      .join(", ");
    query += ` ${
      whereClauseAdded ? "AND" : "WHERE"
    } c.dobna_skupina IN (${ageGroupsList})`;
    whereClauseAdded = true;
  }

  return query;
};

function parseCustomDateString(dateString) {
  const parts = dateString.split(" ");
  const day = parseInt(parts[0].slice(0, -1));
  const month = parseInt(parts[1].slice(0, -1));
  const year = parseInt(parts[2]);
  const timePart = parts[3].split(":");
  const hours = parseInt(timePart[0]);
  const minutes = parseInt(timePart[1]);

  return new Date(year, month - 1, day, hours, minutes);
}

app.post("/searchEvents", async (req, res) => {
  const {
    categories,
    eventTypes,
    organizers,
    ageGroups,
    accessibility,
    startDate,
    endDate,
    sort,
  } = req.body;

  const parsedStartDate = startDate ? new Date(startDate) : null;
  const parsedEndDate = endDate ? new Date(endDate) : null;

  const query = buildEventSearchQuery(
    categories,
    eventTypes,
    organizers,
    ageGroups
  );
  const rows = await queryDatabase(query);

  const filteredByDate = rows.filter((row) => {
    const rowDate = row["datum i vrijeme početka"];
    const parsedRowDate = parseCustomDateString(rowDate);

    const rowDateOnly = new Date(
      parsedRowDate.getFullYear(),
      parsedRowDate.getMonth(),
      parsedRowDate.getDate()
    );

    const startDateOnly =
      parsedStartDate &&
      new Date(
        parsedStartDate.getFullYear(),
        parsedStartDate.getMonth(),
        parsedStartDate.getDate()
      );
    const endDateOnly =
      parsedEndDate &&
      new Date(
        parsedEndDate.getFullYear(),
        parsedEndDate.getMonth(),
        parsedEndDate.getDate()
      );

    const dateInRange =
      (!startDateOnly || rowDateOnly >= startDateOnly) &&
      (!endDateOnly || rowDateOnly <= endDateOnly);

    return dateInRange;
  });

  let filteredByAccessibility = null;

  if (accessibility && accessibility.length > 0) {
    const organiserRows = await queryDatabase("SELECT * FROM organizatori");
    filteredByAccessibility = filteredByDate.filter((row) => {
      const parking = accessibility.includes("kids");
      const disabled = accessibility.includes("disabled");
      const pets = accessibility.includes("pets");
      let parkingCondition = true;
      let disabledCondition = true;
      let petsCondition = true;

      const rowOrganiser = organiserRows.find(
        (org) => org.ime == row.organizator
      );

      if (!rowOrganiser) {
        return false;
      }

      if (parking) {
        parkingCondition = rowOrganiser["Ustanova ima parking"] != null;
      }
      if (disabled) {
        disabledCondition =
          rowOrganiser["Ulaz prilagođen osobama s invaliditetom"] != null;
      }
      if (pets) {
        petsCondition = rowOrganiser["Dopušten ulazak ljubimcima"] != null;
      }

      return parkingCondition && disabledCondition && petsCondition;
    });
  }

  const result = filteredByAccessibility ?? filteredByDate;

  if (sort.param === "earliest") {

  } else {

  }

  res.status(200).json({
    events: result,
    success: true,
    message: "Received search parameters.",
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
