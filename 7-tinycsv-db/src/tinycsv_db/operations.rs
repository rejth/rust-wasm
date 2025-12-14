use super::database::Database;
use super::row::Row;
use super::types::{DataType, Value};

/// Insert a new row into the database.
///
/// # Arguments
/// * `db` - The database to insert the row into
/// * `row` - The row to insert
///
/// # Panics
/// Panics if the row has invalid data types or the number of columns does not match the schema.
pub fn insert_to(db: &mut Database, row: Row) {
    assert_eq!(db.schema.columns.len(), row.values.len());

    for (i, (_, data_type)) in db.schema.columns.iter().enumerate() {
        assert!(
            match data_type {
                DataType::Integer => matches!(row.values[i], Value::Integer(_)),
                DataType::Float => matches!(row.values[i], Value::Float(_)),
                DataType::Text => matches!(row.values[i], Value::Text(_)),
                DataType::Boolean => matches!(row.values[i], Value::Boolean(_)),
            },
            "Invalid data type"
        );
    }

    db.data.push(row);
}

/// Find rows in the database with an exact match for a value in a specific column.
///
/// # Arguments
/// * `db` - The database to search in
/// * `column_name` - The name of the column to search in
/// * `value` - The value to search for
///
/// # Returns
/// A boxed slice of indices of rows that match the exact value in the specified column.
///
/// # Panics
/// Panics if the column is not found in the database.
pub fn find_exact<'a>(db: &'a Database, column_name: &str, value: &Value) -> Box<[usize]> {
    let column_index = match db
        .schema
        .columns
        .iter()
        .position(|(column, _)| column == column_name)
    {
        Some(i) => i,
        None => panic!("Column not found in database: {}", column_name),
    };

    db.data
        .iter()
        .enumerate()
        .filter(|(_, row)| &row.values[column_index] == value)
        .map(|(idx, _)| idx)
        .collect::<Vec<_>>()
        .into_boxed_slice()
}

/// Remove a row from the database with an exact match for a value in a specific column.
///
/// # Arguments
/// * `db` - The database to remove the row from
/// * `column_name` - The name of the column to remove the row from
/// * `value` - The value to remove
///
/// # Returns
/// A vector of references to rows that match the exact value in the specified column.
pub fn remove_exact(db: &mut Database, column_name: &str, value: &Value) {
    for row in find_exact(db, column_name, value) {
        db.data.remove(row);
    }
}

/// Find rows in the database with a partial match for a text in a specific column.
///
/// # Arguments
/// * `db` - The database to search in
/// * `column_name` - The name of the column to search in
/// * `text` - The text to search for
///
/// # Returns
/// A boxed slice of indices of rows that contain the specified text in the specified column.
///
/// # Panics
/// Panics if the column is not found in the database.
pub fn find_contains<'a>(db: &'a Database, column_name: &str, text: &str) -> Box<[usize]> {
    let column_index = match db
        .schema
        .columns
        .iter()
        .position(|(column, _)| column == column_name)
    {
        Some(i) => i,
        None => panic!("Column not found in database: {}", column_name),
    };

    db.data
        .iter()
        .enumerate()
        .filter_map(|(idx, row)| match &row.values[column_index] {
            Value::Text(value) if value.contains(text) => Some(idx),
            _ => None,
        })
        .collect::<Vec<usize>>()
        .into_boxed_slice()
}

/// Convert the database to a CSV string.
///
/// # Arguments
/// * `db` - The database to convert to a CSV string
///
/// # Returns
/// A CSV string representation of the database.
pub fn to_csv(db: &Database) -> String {
    let mut csv = String::new();

    for (column, data_type) in &db.schema.columns {
        csv.push_str(&format!("{}:{:?},", column, data_type));
    }

    csv.pop(); // Remove the last comma
    csv.push('\n'); // Add a new line

    for row in &db.data {
        for value in &row.values {
            match value {
                Value::Text(text) => csv.push_str(&text),
                Value::Integer(num) => csv.push_str(&num.to_string()),
                Value::Float(num) => csv.push_str(&num.to_string()),
                Value::Boolean(bool) => csv.push_str(&bool.to_string()),
            }
            csv.push(',');
        }
        csv.pop(); // Remove the last comma
        csv.push('\n'); // Add a new line
    }

    csv
}
