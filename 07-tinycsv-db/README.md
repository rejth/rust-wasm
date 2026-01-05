# TinyCSV-DB — simple in-memory database with CSV support

Implement the `tinycsv_db` library: a minimalistic database that keeps **exactly one table** in memory and supports the following operations:

- inserting rows
- searching rows by exact value in a column
- searching rows where a text column contains a substring
- deleting rows based on a predicate
- serializing the entire table to a CSV string (including headers)
- restoring the table from a CSV string

Supported cell types: integers (`i64`), floats (`f64`), booleans, and strings.

Organize the library into logical modules.

## Example usage

```rust
use tinycsv_db::*;

fn main() {
    let schema = schema::new(vec![
        ("id".to_string(),       DataType::Integer),
        ("name".to_string(),     DataType::Text),
        ("score".to_string(),    DataType::Float),
        ("active".to_string(),   DataType::Boolean),
    ]);

    let mut db = database::new(schema);

    // Insert
    insert_to(&mut db, row::new(vec![
        Value::Integer(1),
        Value::Text("Alice".to_string()),
        Value::Float(95.5),
        Value::Boolean(true),
    ]));

    // Search
    let ids = find_exact(&db, "name", &Value::Text("Alice".to_string()));
    let contains = find_contains(&db, "name", "lic");

    // Serialize / deserialize
    let csv = to_csv(&db);
    let db2 = database::from_csv(&csv);
}
```
