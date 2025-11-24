use super::database::Database;
use super::types::Value;

/// Convert the database to a CSV string.
///
/// # Arguments
/// * `db` - The database to convert to a CSV string
///
/// # Returns
/// A CSV string representation of the database.
pub fn to_csv(db: &Database) -> String {
    let mut csv = String::new();

    for (column, _) in &db.schema.columns {
        csv.push_str(column);
        csv.push(',');
    }

    csv.pop();
    csv.push('\n');

    for row in &db.rows {
        for value in &row.values {
            match value {
                Value::Text(char) => csv.push_str(&char),
                Value::Integer(num) => csv.push_str(&num.to_string()),
                Value::Float(num) => csv.push_str(&num.to_string()),
                Value::Boolean(bool) => csv.push_str(&bool.to_string()),
            }
            csv.push(',');
        }
        csv.pop();
        csv.push('\n');
    }

    csv
}
