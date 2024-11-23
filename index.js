import express from "express";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import cors from "cors";
import NodeGeocoder from "node-geocoder";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3456;
const dbName = process.env.DB || "database.db";

const db = new sqlite3.Database(dbName, (err) => {
  if (err) {
    console.error("Failed to connect to the database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

const options = {
  provider: "opencage",
  apiKey: process.env.GEOCODER,
};

const geocoder = NodeGeocoder(options);

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
  const organiserRows = await queryDatabase("SELECT * FROM organizatori");

  if (accessibility && accessibility.length > 0) {
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

  const updatedResult = await Promise.all(
    result.map(async (row) => {
      const rowOrganiser = organiserRows.find(
        (org) => org.ime === row.organizator
      );

      if (!rowOrganiser) {
        return row;
      }

      const location = {
        address: rowOrganiser.lokacija,
      };

      try {
        // Geocode the address to get latitude and longitude
        const geocodeRes = await geocoder.geocode(location.address);

        if (geocodeRes.length > 0) {
          location.latitude = geocodeRes[0].latitude;
          location.longitude = geocodeRes[0].longitude;
        }
      } catch (err) {
        console.error(`Failed to geocode address: ${location.address}`, err);
      }

      return {
        ...row,
        location,
      };
    })
  );

  if (!sort || sort.param === "earliest") {
    updatedResult.sort((a, b) => {
      const dateA = parseCustomDateString(a["datum i vrijeme početka"]);
      const dateB = parseCustomDateString(b["datum i vrijeme početka"]);

      const comparison = dateA - dateB;
      return sort?.reverse ? -comparison : comparison;
    });
  } else if (sort.param === "location") {
    const referenceLatitude = sort?.latitude || 45.815; // Default: Zagreb center
    const referenceLongitude = sort?.longitude || 15.9819;

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371; // Earth's radius in kilometers

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    updatedResult.sort((a, b) => {
      const locationA = a.location || {};
      const locationB = b.location || {};

      const hasCoordinatesA =
        locationA.latitude !== undefined && locationA.longitude !== undefined;
      const hasCoordinatesB =
        locationB.latitude !== undefined && locationB.longitude !== undefined;

      if (!hasCoordinatesA && !hasCoordinatesB) return 0;
      if (!hasCoordinatesA) return 1;
      if (!hasCoordinatesB) return -1;

      const distanceA = calculateDistance(
        referenceLatitude,
        referenceLongitude,
        locationA.latitude,
        locationA.longitude
      );
      const distanceB = calculateDistance(
        referenceLatitude,
        referenceLongitude,
        locationB.latitude,
        locationB.longitude
      );

      const comparison = distanceA - distanceB;
      return sort?.reverse ? -comparison : comparison;
    });
  }

  res.status(200).json({
    events: updatedResult,
    success: true,
    message: "Received search parameters.",
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
