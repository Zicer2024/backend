# API Endpoints Documentation

## Base URL
http://localhost:3456

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