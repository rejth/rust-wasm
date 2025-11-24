use super::database::Database;
use super::row::Row;
use super::types::Value;

/// Find rows in the database with an exact match for a value in a specific column.
///
/// # Arguments
/// * `db` - The database to search in
/// * `column_name` - The name of the column to search in
/// * `value` - The value to search for
///
/// # Returns
/// A vector of references to rows that match the exact value in the specified column.
pub fn find_exact<'a>(db: &'a Database, column_name: &str, value: &Value) -> Vec<&'a Row> {
    let column_index = db
        .schema
        .columns
        .iter()
        .position(|(column, _)| column == column_name)
        .unwrap();

    db.rows
        .iter()
        .filter(|row| &row.values[column_index] == value)
        .collect()
}

/// Find rows in the database with a partial match for a text in a specific column.
///
/// # Arguments
/// * `db` - The database to search in
/// * `column_name` - The name of the column to search in
/// * `text` - The text to search for
///
/// # Returns
/// A vector of references to rows that contain the specified text in the specified column.
pub fn find_contains<'a>(db: &'a Database, column_name: &str, text: &str) -> Vec<&'a Row> {
    let column_index = db
        .schema
        .columns
        .iter()
        .position(|(column, _)| column == column_name)
        .unwrap();

    db.rows
        .iter()
        .filter(|row| {
            if let Value::Text(s) = &row.values[column_index] {
                s.contains(text)
            } else {
                false
            }
        })
        .collect()
}
