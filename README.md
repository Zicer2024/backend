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

