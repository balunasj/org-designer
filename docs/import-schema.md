# Import Schema: `all_users.json`

Org Designer loads organizational data from `data/all_users.json`. This file must be a JSON array of person objects conforming to the schema below. The built-in LDAP adapter produces this file; if your data lives elsewhere, write your own adapter.

## Schema

### Required fields

| Field               | Type           | Description                                                                       |
| ------------------- | -------------- | --------------------------------------------------------------------------------- |
| `uid`               | string         | Unique identifier for the person                                                  |
| `cn`                | string         | Common name / full name                                                           |
| `displayName`       | string         | Display name (may differ from `cn`)                                               |
| `manager`           | string \| null | `uid` of this person's direct manager. Root person has `null` or their own `uid`. |
| `preferredLastName` | string         | Preferred last name                                                               |
| `jobTitle`          | string         | Job title                                                                         |
| `jobRole`           | string         | Role category used for grouping (e.g. "Manager", "Engineer", "Designer")          |
| `geo`               | string         | Geographic region (e.g. "NA", "EMEA", "APAC")                                     |
| `co`                | string         | Country name                                                                      |
| `l`                 | string         | City / locality                                                                   |
| `location`          | string         | Office location label                                                             |
| `hireDate`          | string         | Hire date (ISO 8601 or any consistent string format)                              |

### Optional enrichment fields

These are added by the bundled `enrich_users.py` script. The app works without them but degrades gracefully (no map view, no report count display).

| Field           | Type   | Description                                    |
| --------------- | ------ | ---------------------------------------------- |
| `directReports` | number | Count of direct reports                        |
| `totalReports`  | number | Count of all reports in subtree                |
| `lat`           | number | Latitude (geocoded)                            |
| `lng`           | number | Longitude (geocoded)                           |
| `geoSource`     | string | `"city"` or `"country"` — precision of geocode |

### Other fields

Any additional fields are passed through and stored on the person record but not used by the app.

## Example record

```json
{
  "uid": "jsmith",
  "cn": "Jane Smith",
  "displayName": "Jane Smith",
  "manager": "bjones",
  "preferredLastName": "Smith",
  "jobTitle": "Senior Software Engineer",
  "jobRole": "Engineer",
  "geo": "NA",
  "co": "United States",
  "l": "Raleigh",
  "location": "RDU Office",
  "hireDate": "2019-03-15",
  "directReports": 0,
  "totalReports": 0,
  "lat": 35.7796,
  "lng": -78.6382,
  "geoSource": "city"
}
```

## Building a custom adapter

An adapter is any script or program that writes a conforming `all_users.json`. Override the default path with:

```bash
ALL_USERS_PATH=/path/to/your/output.json make import
```

### Example adapter outline (Python)

```python
import json

def fetch_people():
    """Fetch from your directory (Azure AD, Okta, CSV, etc.)"""
    ...

def transform(raw_person):
    return {
        "uid":              raw_person["id"],
        "cn":               raw_person["name"],
        "displayName":      raw_person["displayName"],
        "manager":          raw_person.get("managerId"),
        "preferredLastName": raw_person.get("surname", ""),
        "jobTitle":         raw_person.get("jobTitle", ""),
        "jobRole":          raw_person.get("department", ""),
        "geo":              raw_person.get("officeLocation", ""),
        "co":               raw_person.get("country", ""),
        "l":                raw_person.get("city", ""),
        "location":         raw_person.get("officeLocation", ""),
        "hireDate":         raw_person.get("hireDate", ""),
    }

people = [transform(p) for p in fetch_people()]
with open("data/all_users.json", "w") as f:
    json.dump(people, f)
```

After generating `all_users.json`, optionally run enrichment to add report counts:

```bash
python scripts/enrich_users.py data/all_users.json > data/all_users_enriched.json
mv data/all_users_enriched.json data/all_users.json
```

Then run:

```bash
make import   # builds data/baseline.json from all_users.json + org YAML
```

## Bundled LDAP adapter

For LDAP directories, two scripts handle the conversion:

1. **`scripts/ldif_to_json.py`** — parses `ldapsearch` LDIF output to JSON, translating vendor-specific field names to the generic schema above
2. **`scripts/enrich_users.py`** — adds geocoding and report count fields

Run the full LDAP pipeline with:

```bash
make fetch-users   # requires LDAP access + ldap-utils
```

See `Makefile` for the full command sequence.
