# API Endpoints Documentation

## Base URL
http://localhost:3456

---

## Endpoints

### 1. Get Data from Any Table
- **URL**: `/data/:table`
- **Method**: `GET`
- **Description**: Returns all rows from the specified table.
- **Path Parameter**:
  - `:table`: The name of the table to query. Available tables:
    - `dobne_skupine`
    - `eventi`
    - `gradske_cetvrti`
    - `kategorije`
    - `korisnici`
    - `ocjene`
    - `organizatori`
    - `tipovi_dogadaja`
    - `tipovi_organizatora`
    - `ucestalost`

---

### 2. Register a New User
- **URL**: `/register`
- **Method**: `POST`
- **Description**: Registers a new user.
- **Request Body**:
  ```json
  {
    "username": "user123",
    "password": "password123",
    "email": "user@example.com",
    "name": "John Doe"
  }
  ```
- **Responses**:
  - `201`: 
    ```json
    {
      "success": true,
      "message": "User registered successfully."
    }
    ```
  - `400` (Missing fields or duplicate username/email):
    ```json
    {
      "success": false,
      "message": "Missing required fields." // or "Username or email already exists."
    }
    ```
  - `500` (Server error):
    ```json
    {
      "success": false,
      "message": "Failed to register user."
    }
    ```

---

### 3. User Login
- **URL**: `/login`
- **Method**: `POST`
- **Description**: Authenticates a user using either username or email.
- **Request Body**:
  ```json
  {
    "usernameOrEmail": "user123",
    "password": "password123"
  }
  ```
- **Responses**:
  - `200` (Successful login):
    ```json
    {
      "success": true,
      "message": "Login successful.",
      "user": {
        "id": 1,
        "username": "user123",
        "email": "user@example.com",
        "name": "John Doe"
      }
    }
    ```
  - `401` (Invalid credentials):
    ```json
    {
      "success": false,
      "message": "Invalid username or password."
    }
    ```
  - `500` (Server error):
    ```json
    {
      "success": false,
      "message": "Failed to log in."
    }
    ```

---

### 4. Get Categories
- **URL**: `/categories`
- **Method**: `GET`
- **Description**: Returns a sorted list of all category names from the `kategorije` table.
- **Responses**:
  - `200`: Returns an array of category names.
    ```json
    [
      "Category1",
      "Category2",
      "Category3"
    ]
    ```
  - `500` (Server error)

---

### 5. Get Event Types
- **URL**: `/eventTypes`
- **Method**: `GET`
- **Description**: Returns a sorted list of all event type names from the `tipovi_dogadaja` table.
- **Responses**:
  - `200`: Returns an array of event type names.
    ```json
    [
      "EventType1",
      "EventType2",
      "EventType3"
    ]
    ```
  - `500` (Server error)

---

### 6. Get Organizers
- **URL**: `/organizers`
- **Method**: `GET`
- **Description**: Returns a sorted list of all organizer names from the `organizatori` table.
- **Responses**:
  - `200`: Returns an array of organizer names.
    ```json
    [
      "Organizer1",
      "Organizer2",
      "Organizer3"
    ]
    ```
  - `500` (Server error)

### 7. Get Age Groups
- **URL**: `/ageGroups`
- **Method**: `GET`
- **Description**: Returns a sorted list of all age groups from the `dobne_skupine` table.
- **Responses**:
  - `200`: Returns an array of age groups.
    ```json
    [
      "djeca (0-15)",
      "mladi (16-29)",
      "odrasli (30+)"
    ]
    ```
  - `500` (Server error)

### 8. Get Column Values
- **URL**: `/columnValues`
- **Method**: `GET`
- **Description**: Returns an union of 4 requests above.
- **Responses**:
  - `200`: Returns an object with arrays of results.
    ```json
    {
      "categories": [
        "Category1",
        "Category2",
        "Category3"
      ],
      "event_types": [
        "EventType1",
        "EventType2",
        "EventType3"
      ],
      "organizers": [
        "Organizer1",
        "Organizer2",
        "Organizer3"
      ],
      "age_groups": [
        "djeca (0-15)",
        "mladi (16-29)",
        "odrasli (30+)"
      ]
    }
    ```
  - `500` (Server error)